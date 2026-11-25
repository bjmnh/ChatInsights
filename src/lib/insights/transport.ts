import { isProxyCandidate, isPrivateHost } from './proxyPolicy.ts';

export type FetchLike = (input: string, init: RequestInit & { duplex?: 'half' }) => Promise<Response>;

export class ProviderRequestError extends Error {
  readonly status: number;
  readonly kind: 'rate' | 'server' | 'safety' | 'auth' | 'cors' | 'schema' | 'bad' | 'timeout';
  readonly retryAfterMs?: number;

  constructor(message: string, status: number, kind: ProviderRequestError['kind'], retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderRequestError';
    this.status = status;
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Retry-After as seconds or an HTTP date. Absent or unreadable headers return undefined. */
export function headerRetryAfterMs(headers: Headers): number | undefined {
  const retryAfter = headers.get('retry-after')?.trim();
  if (!retryAfter) return undefined;
  if (/^\d+(\.\d+)?$/.test(retryAfter)) return Math.min(120_000, Math.round(Number(retryAfter) * 1000));
  const when = Date.parse(retryAfter);
  if (Number.isNaN(when)) return undefined;
  return Math.min(120_000, Math.max(0, when - Date.now()));
}

/** The wait before the next try. Attempt 0 waits 2s, then 4s, 8s, 16s, 32s, capped at 60s. A Retry-After longer than that wins, up to 2 minutes. */
export function retryWaitMs(attempt: number, headerMs?: number): number {
  const backoff = Math.min(60_000, 2000 * 2 ** Math.max(0, attempt));
  if (headerMs && headerMs > backoff) return Math.min(120_000, headerMs);
  return backoff;
}

export function retryDelayMs(headers: Headers, attempt: number): number {
  return retryWaitMs(attempt, headerRetryAfterMs(headers));
}

/** 429 is rate limiting. 503 and other server errors are the provider being busy. */
export function providerWaitMessage(status: number, waitMs: number, attempt: number): string {
  const seconds = Math.max(1, Math.ceil(waitMs / 1000));
  if (status === 408) return `The provider did not answer in time. Retrying in ${seconds}s… (attempt ${attempt} of 5).`;
  const cause = status === 429 ? 'rate-limiting' : 'busy';
  return `The provider is ${cause} (${status}). Retrying in ${seconds}s… (attempt ${attempt} of 5).`;
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
  options?: { fetchImpl?: FetchLike; proxy?: 'auto' | 'never'; extraAllowlist?: string[]; timeoutMs?: number },
): Promise<TransportResult> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const proxy = options?.proxy ?? 'auto';
  const timeoutMs = options?.timeoutMs ?? PROVIDER_CALL_TIMEOUT_MS;
  const target = new URL(url);
  const timeout = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => timeout.abort(), timeoutMs) : undefined;
  if (init.signal) {
    if (init.signal.aborted) timeout.abort();
    else init.signal.addEventListener('abort', () => timeout.abort(), { once: true });
  }
  const signal = timeout.signal;
  try {
    const response = await fetchImpl(url, { ...init, signal });
    const text = await response.text();
    return { response, viaProxy: false, text };
  } catch (error) {
    const aborted = timeout.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    if (aborted && !init.signal?.aborted) {
      throw new ProviderRequestError(
        `The provider did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
        408,
        'timeout',
      );
    }
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
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const PROVIDER_AUTH_MESSAGE = 'Your API key was rejected by the provider. Check the key and try again.';
export const PROVIDER_CALL_TIMEOUT_MS = 120_000;

const AUTH_TEXT = /api[_ -]?key|api_key_invalid|unauthenticated|permission denied|invalid[_ ]?key/i;

/** 401/403, and the 400 Gemini (and some compatible hosts) return for a bad key. */
export function isProviderAuthFailure(status: number, text: string): boolean {
  if (status === 401 || status === 403) return true;
  if (status !== 400 && status !== 422 && status !== 0) return false;
  return AUTH_TEXT.test(text);
}

export function providerAuthError(error: unknown): ProviderRequestError | null {
  if (!(error instanceof Error)) return null;
  if (error instanceof ProviderRequestError && (error.kind === 'cors' || error.kind === 'rate' || error.kind === 'server' || error.kind === 'safety' || error.kind === 'schema' || error.kind === 'timeout')) {
    return null;
  }
  const status = error instanceof ProviderRequestError ? error.status : 0;
  const kind = error instanceof ProviderRequestError ? error.kind : null;
  if (kind === 'auth' || isProviderAuthFailure(status, error.message)) {
    return new ProviderRequestError(PROVIDER_AUTH_MESSAGE, status || 401, 'auth');
  }
  return null;
}

export function throwForStatus(status: number, text: string, headers: Headers): void {
  if (status === 429) {
    throw new ProviderRequestError('The provider asked us to slow down.', status, 'rate', headerRetryAfterMs(headers));
  }
  if (status >= 500) {
    throw new ProviderRequestError('The provider had a server error.', status, 'server', headerRetryAfterMs(headers));
  }
  if (isProviderAuthFailure(status, text)) {
    throw new ProviderRequestError(PROVIDER_AUTH_MESSAGE, status, 'auth');
  }
  if (status >= 400) {
    throw new ProviderRequestError(clip(text) || `Provider returned ${status}`, status, 'bad');
  }
}

function clip(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 240);
}

export async function completeWithRetry<T>(
  run: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  onRetry?: (info: { attempt: number; waitMs: number; status: number }) => void,
  onAttempt?: (attempt: number) => void,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) onAttempt?.(attempt + 1);
    try {
      return await run();
    } catch (error) {
      if (error instanceof ProviderRequestError && (error.kind === 'rate' || error.kind === 'server' || error.kind === 'timeout')) {
        last = error;
        if (attempt >= 4) break;
        const wait = retryWaitMs(attempt, error.retryAfterMs);
        const status = error.status || (error.kind === 'rate' ? 429 : error.kind === 'timeout' ? 408 : 503);
        let remaining = wait;
        while (remaining > 0) {
          onRetry?.({ attempt: attempt + 1, waitMs: remaining, status });
          const slice = Math.min(1000, remaining);
          await sleep(slice);
          remaining -= slice;
        }
        continue;
      }
      throw error;
    }
  }
  throw last instanceof Error ? last : new ProviderRequestError('Gave up after retries', 429, 'rate');
}
