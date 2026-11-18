import { reserveRateSlot } from '../server/rateLimit';
import { subjectHash } from '../archive/token';
import {
  KEY_RATE_LIMIT,
  KEY_RATE_WINDOW_MS,
  keyHint,
  safeKeyError,
  validateProviderId,
  validateProviderSecret,
} from './policy';

export interface ProviderKeyDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function currentUser(request: Request, deps: ProviderKeyDeps, fetchImpl: typeof fetch): Promise<string | null> {
  const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt === deps.anonKey) return null;
  const response = await fetchImpl(new URL('/auth/v1/user', deps.supabaseUrl), {
    headers: { authorization: `Bearer ${jwt}`, apikey: deps.anonKey },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  const id = body && typeof body === 'object' && 'id' in body ? (body as { id?: unknown }).id : null;
  return typeof id === 'string' ? id : null;
}

function rpcError(body: unknown, action: 'save' | 'load'): string {
  const message = body && typeof body === 'object' && 'message' in body
    ? String((body as { message?: unknown }).message ?? '')
    : '';
  return safeKeyError(message, action);
}

export async function handleProviderKeys(request: Request, deps: ProviderKeyDeps): Promise<Response> {
  if (!deps.supabaseUrl || !deps.serviceRoleKey || !deps.anonKey) {
    return json({ error: 'Account key storage is not configured.' }, 503);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? Date.now();
  const userId = await currentUser(request, deps, fetchImpl);
  if (!userId) return json({ error: 'Sign in to save a key to your account.' }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'The key request could not be read.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'The key request could not be read.' }, 400);
  }
  const record = body as Record<string, unknown>;
  const action = record.action === 'save' || record.action === 'load' ? record.action : null;
  if (!action || !validateProviderId(record.provider)) {
    return json({ error: 'That provider cannot be saved.' }, 400);
  }
  const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();

  if (action === 'load') {
    const response = await fetchImpl(new URL('/rest/v1/rpc/load_my_provider_key', deps.supabaseUrl), {
      method: 'POST',
      headers: {
        apikey: deps.anonKey,
        authorization: `Bearer ${jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_provider: record.provider }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) return json({ error: rpcError(payload, 'load') }, response.status === 401 ? 401 : 502);
    if (payload === null) return json({ saved: false });
    const secret = payload && typeof payload === 'object' && 'secret' in payload
      ? (payload as { secret?: unknown }).secret
      : null;
    const hint = payload && typeof payload === 'object' && 'key_hint' in payload
      ? (payload as { key_hint?: unknown }).key_hint
      : null;
    if (typeof secret !== 'string' || typeof hint !== 'string' || hint !== keyHint(secret)) {
      return json({ error: 'The saved key could not be loaded.' }, 502);
    }
    return json({ saved: true, hint, key: secret });
  }

  if (!validateProviderSecret(record.secret)) {
    return json({ error: 'That key cannot be saved. Use a single line of at least 8 characters.' }, 400);
  }
  const allowed = await reserveRateSlot({
    supabaseUrl: deps.supabaseUrl,
    serviceRoleKey: deps.serviceRoleKey,
    fetchImpl,
    subjects: [await subjectHash('key', userId, deps.serviceRoleKey)],
    now,
    limit: KEY_RATE_LIMIT,
    windowMs: KEY_RATE_WINDOW_MS,
  });
  if (!allowed) return json({ error: 'Too many key saves. Wait and try again.' }, 429);

  const response = await fetchImpl(new URL('/rest/v1/rpc/save_my_provider_key', deps.supabaseUrl), {
    method: 'POST',
    headers: {
      apikey: deps.anonKey,
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_provider: record.provider, p_secret: record.secret }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    return json({ error: rpcError(payload, 'save') }, 502);
  }
  return json({ saved: true, hint: keyHint(record.secret) });
}
