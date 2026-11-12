import { isProxyCandidate, isPrivateHost } from './proxyPolicy.ts';

export type FetchLike = (input: string, init: RequestInit & { duplex?: 'half' }) => Promise<Response>;

export class ProviderRequestError extends Error {
  readonly status: number;
  readonly kind: 'rate' | 'server' | 'safety' | 'auth' | 'cors' | 'schema' | 'bad';
  readonly retryAfterMs?: number;

  constructor(message: string, status: number, kind: ProviderRequestError['kind'], retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderRequestError';
    this.status = status;
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

export function retryDelayMs(headers: Headers, attempt: number): number {
  const retryAfter = headers.get('retry-after');
  if (retryAfter && /^\d+(\.\d+)?$/.test(retryAfter.trim())) {
    return Math.min(120_000, Math.round(Number(retryAfter) * 1000));
  }
  const base = Math.min(30_000, 1000 * 2 ** attempt);
  return base + Math.floor(Math.random() * 250);
}

export function isSchemaRejection(status: number, body: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /response_format|json_schema|structured|output_config|unknown field|response_schema|invalid schema|tool_choice/i.test(body);
}

export interface TransportResult {
  response: Response;
  viaProxy: boolean;
  text: string;
}

const FORWARD_HEADERS = [
  'authorization',
  'x-api-key',
  'content-type',
  'anthropic-version',
  'anthropic-dangerous-direct-browser-access',
  'accept',
];

export async function providerFetch(
  url: string,
  init: RequestInit,
  options?: { fetchImpl?: FetchLike; proxy?: 'auto' | 'never'; extraAllowlist?: string[] },
): Promise<TransportResult> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const proxy = options?.proxy ?? 'auto';
  const target = new URL(url);
  try {
    const response = await fetchImpl(url, init);
    const text = await response.text();
    return { response, viaProxy: false, text };
  } catch (error) {
    const blocked = error instanceof TypeError;
    if (!blocked || proxy === 'never') {
      throw new ProviderRequestError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'cors',
      );
    }
    if (isPrivateHost(target.hostname) || target.hostname === 'localhost') {
      throw new ProviderRequestError(
        'The browser could not reach this server. Local and private addresses are never sent through the Chat Insights pass-through.',
        0,
        'cors',
      );
    }
    if (!isProxyCandidate(target.hostname, options?.extraAllowlist)) {
      throw new ProviderRequestError(
        'The browser blocked this call, and this host is not on the pass-through allowlist.',
        0,
        'cors',
      );
    }
    const headers = new Headers(init.headers);
    const proxied = new Headers();
    proxied.set('x-ci-host', target.hostname);
    proxied.set('x-ci-path', `${target.pathname}${target.search}`);
    proxied.set('x-ci-method', (init.method ?? 'POST').toUpperCase());
    for (const name of FORWARD_HEADERS) {
      const value = headers.get(name);
      if (value) proxied.set(name, value);
    }
    const response = await fetchImpl('/api/provider-proxy', {
      method: 'POST',
      headers: proxied,
      body: init.body,
    });
    const text = await response.text();
    return { response, viaProxy: true, text };
  }
}

export function throwForStatus(status: number, text: string, headers: Headers): void {
  if (status === 401 || status === 403) {
    throw new ProviderRequestError(readableAuth(text), status, 'auth');
  }
  if (status === 429) {
    throw new ProviderRequestError('The provider asked us to slow down.', status, 'rate', retryDelayMs(headers, 0));
  }
  if (status >= 500) {
    throw new ProviderRequestError('The provider had a server error.', status, 'server', retryDelayMs(headers, 0));
  }
  if (status >= 400) {
    throw new ProviderRequestError(clip(text) || `Provider returned ${status}`, status, 'bad');
  }
}

function readableAuth(text: string): string {
  if (/credit|billing|quota|payment/i.test(text)) return 'The key was rejected. The account may be out of credit or missing billing.';
  return 'That key was rejected.';
}

function clip(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 240);
}

export async function completeWithRetry<T>(
  run: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (error instanceof ProviderRequestError && (error.kind === 'rate' || error.kind === 'server')) {
        last = error;
        const wait = error.retryAfterMs ?? Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);
        await sleep(wait);
        continue;
      }
      throw error;
    }
  }
  throw last instanceof Error ? last : new ProviderRequestError('Gave up after retries', 429, 'rate');
}
