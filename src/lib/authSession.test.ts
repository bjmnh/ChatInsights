/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isSupabaseSessionKey, readStoredSessionUser } from './authSession';

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

  it('returns null when nothing is stored', () => {
    expect(readStoredSessionUser({ length: 0, key: () => null, getItem: () => null })).toBeNull();
  });
});
