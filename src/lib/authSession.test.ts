/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { clearStoredAuthTokens, isExpiredSession, isSupabaseSessionKey, readStoredSessionUser } from './authSession';

describe('stored session', () => {
  it('reads the Supabase auth user and ignores the code verifier', () => {
    const values = new Map<string, string>([
      ['sb-project-auth-token-code-verifier', JSON.stringify({ user: { id: 'verifier' } })],
      ['sb-project-auth-token', JSON.stringify({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1_900_000_000,
        user: { id: 'user-1', email: 'ada@example.com', user_metadata: { name: 'Ada' } },
      })],
    ]);
    const storage = {
      length: values.size,
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
    };
    expect(isSupabaseSessionKey('sb-project-auth-token')).toBe(true);
    expect(isSupabaseSessionKey('sb-project-auth-token-code-verifier')).toBe(false);
    expect(readStoredSessionUser(storage)).toMatchObject({ id: 'user-1', email: 'ada@example.com' });
  });

  it('treats a missing auth session and an edge-function 401 as expired', () => {
    expect(isExpiredSession({ message: 'Auth session missing!' })).toBe(true);
    expect(isExpiredSession({ status: 401, message: 'Sign in to save a key to your account.' })).toBe(true);
    expect(isExpiredSession({ message: 'The provider had a server error.' })).toBe(false);
  });

  it('removes the stored auth token', () => {
    const values = new Map<string, string>([['sb-project-auth-token', '{}'], ['other', '1']]);
    const storage = {
      length: values.size,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
        storage.length = values.size;
      },
    };
    clearStoredAuthTokens(storage);
    expect(values.has('sb-project-auth-token')).toBe(false);
    expect(values.has('other')).toBe(true);
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredSessionUser({ length: 0, key: () => null, getItem: () => null })).toBeNull();
  });
});
