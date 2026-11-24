/**
 * The header has to know who is signed in on the first paint. Supabase
 * restores that session asynchronously, and a null result from getSession()
 * can arrive after the stored session was already shown. Reading the same
 * localStorage record Supabase writes lets the header match the session
 * immediately, then the auth listener confirms or clears it.
 */
export interface StoredSessionUser {
  id: string;
  email?: string;
  user_metadata?: { name?: string; avatar_url?: string };
}

function userFromUnknown(value: unknown): StoredSessionUser | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const nested = [record.user, (record.currentSession as { user?: unknown } | undefined)?.user, (record.session as { user?: unknown } | undefined)?.user];
  for (const candidate of nested) {
    if (!candidate || typeof candidate !== 'object') continue;
    const user = candidate as StoredSessionUser;
    if (typeof user.id === 'string' && user.id) return user;
  }
  return null;
}

export function isSupabaseSessionKey(key: string): boolean {
  return key.startsWith('sb-') && key.endsWith('-auth-token');
}

export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.';
export const SESSION_EXPIRED_EVENT = 'ci-session-expired';

export function isExpiredSession(input: { status?: number; message?: string }): boolean {
  const message = input.message ?? '';
  if (/auth session missing|session missing|invalid refresh token|refresh token|jwt expired|invalid jwt/i.test(message)) return true;
  return input.status === 401;
}

export function clearStoredAuthTokens(storage: Pick<Storage, 'length' | 'key' | 'removeItem'> | null | undefined = globalThis.localStorage): void {
  if (!storage) return;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isSupabaseSessionKey(key)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function requestSessionExpiry(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function readStoredSessionUser(storage: Pick<Storage, 'length' | 'key' | 'getItem'> | null | undefined = globalThis.localStorage): StoredSessionUser | null {
  if (!storage) return null;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !isSupabaseSessionKey(key)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      let parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      const user = userFromUnknown(parsed);
      if (user) return user;
    }
  } catch {
    return null;
  }
  return null;
}
