import { isAllowedProxyPath, isAllowlistedHost, isPrivateHost, parseExtraAllowlist } from './proxyPolicy.ts';

export const PROXY_MAX_BYTES = 1_500_000;
export const PROXY_RATE_LIMIT = 30;
export const PROXY_RATE_WINDOW_MS = 60_000;
export const PROXY_TIMEOUT_MS = 120_000;

const FORWARD = new Set([
  'authorization',
  'x-api-key',
  'content-type',
  'anthropic-version',
  'anthropic-dangerous-direct-browser-access',
  'accept',
]);

export interface RateLimiter {
  allow(ip: string, now: number): boolean;
}

export function createRateLimiter(limit = PROXY_RATE_LIMIT, windowMs = PROXY_RATE_WINDOW_MS): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(ip: string, now: number) {
      const recent = (hits.get(ip) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(ip, recent);
        return false;
      }
      recent.push(now);
      hits.set(ip, recent);
      return true;
    },
  };
}

export interface ProxyDeps {
  ip: string;
  fetchImpl?: typeof fetch;
  now?: number;
  extraAllowlist?: string[];
  limiter?: RateLimiter;
  maxBytes?: number;
}

function json(status: number, error: string, extra?: HeadersInit): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...Object.fromEntries(new Headers(extra)) },
  });
}

export async function handleProxyRequest(request: Request, deps: ProxyDeps): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json(405, 'Method not allowed');

  const limiter = deps.limiter ?? createRateLimiter();
  if (!limiter.allow(deps.ip || 'unknown', deps.now ?? Date.now())) {
    return json(429, 'Too many pass-through requests from this network. Wait a minute.', { 'retry-after': '60' });
  }

  const host = (request.headers.get('x-ci-host') ?? '').trim().toLowerCase();
  const path = request.headers.get('x-ci-path') ?? '';
  const method = (request.headers.get('x-ci-method') ?? 'POST').toUpperCase();
  if (method !== 'POST' && method !== 'GET') return json(405, 'Method not allowed');
  if (!host || isPrivateHost(host) || !isAllowlistedHost(host, deps.extraAllowlist ?? [])) {
    return json(403, 'That host is not on the pass-through allowlist.');
  }
  if (!isAllowedProxyPath(path)) return json(403, 'That path is not allowed.');

  const declared = Number(request.headers.get('content-length') ?? '0');
  const maxBytes = deps.maxBytes ?? PROXY_MAX_BYTES;
  if (declared > maxBytes) return json(413, 'Request is too large for one batch.');
  const body = method === 'GET' ? null : await request.arrayBuffer();
  if (body && body.byteLength > maxBytes) return json(413, 'Request is too large for one batch.');

  const outbound = new Headers();
  outbound.set('accept', request.headers.get('accept') ?? 'application/json');
  request.headers.forEach((value, key) => {
    if (FORWARD.has(key.toLowerCase())) outbound.set(key, value);
  });
  outbound.delete('origin');
  outbound.delete('cookie');
  outbound.delete('referer');
  outbound.delete('referrer');

  const fetchImpl = deps.fetchImpl ?? fetch;
  let upstream: Response;
  try {
    upstream = await fetchImpl(`https://${host}${path}`, {
      method,
      headers: outbound,
      body: body ?? undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch {
    return json(502, 'The provider did not answer.');
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    return json(502, 'The provider tried to redirect the request. That was not followed.');
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  for (const name of ['retry-after', 'cache-control']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith('x-ratelimit')) responseHeaders.set(key, value);
  });
  responseHeaders.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export function extraAllowlistFromEnv(raw: string | undefined): string[] {
  return parseExtraAllowlist(raw);
}
