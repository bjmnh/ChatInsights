export interface SavedProviderKey {
  hint: string;
  secret: string;
}

export class ProviderKeyError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ProviderKeyError';
    this.status = status;
  }
}

interface KeyClientOptions {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  provider: string;
  fetchImpl?: typeof fetch;
}

async function post(options: KeyClientOptions, body: unknown): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(new URL('/functions/v1/provider-keys', options.supabaseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      apikey: options.anonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { error?: unknown; saved?: unknown; hint?: unknown; key?: unknown };
  if (!response.ok) {
    throw new ProviderKeyError(typeof payload.error === 'string' ? payload.error : 'The key could not be saved to your account.', response.status);
  }
  return payload;
}

export async function loadAccountProviderKey(options: KeyClientOptions): Promise<SavedProviderKey | null> {
  const payload = await post(options, { action: 'load', provider: options.provider }) as {
    saved?: unknown;
    hint?: unknown;
    key?: unknown;
  };
  if (payload.saved !== true) return null;
  if (typeof payload.hint !== 'string' || typeof payload.key !== 'string') {
    throw new ProviderKeyError('The saved key could not be loaded.');
  }
  return { hint: payload.hint, secret: payload.key };
}

export async function saveAccountProviderKey(options: KeyClientOptions & { secret: string }): Promise<SavedProviderKey> {
  const payload = await post(options, { action: 'save', provider: options.provider, secret: options.secret }) as {
    hint?: unknown;
  };
  if (typeof payload.hint !== 'string') throw new ProviderKeyError('The key could not be saved to your account.');
  return { hint: payload.hint, secret: options.secret };
}
