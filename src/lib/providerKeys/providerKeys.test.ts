import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { handleProviderKeys } from './handler';
import { keyHint, validateProviderSecret } from './policy';

const secret = 'service-role-test-key';
const anon = 'anon-test-key';
const supabaseUrl = 'https://yaykfgyucipnqufydyjb.supabase.co';
const apiKey = 'sk-test-key-1234';

describe('provider key policy', () => {
  it('keeps only the last four characters as the hint', () => {
    expect(keyHint(apiKey)).toBe('1234');
    expect(validateProviderSecret('short')).toBe(false);
    expect(validateProviderSecret(`line\nbreak-key`)).toBe(false);
    expect(validateProviderSecret(apiKey)).toBe(true);
  });
});

describe('provider key function', () => {
  it('saves through the user jwt and does not log the key', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.map(String).join(' ')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => logs.push(args.map(String).join(' ')));
    let rpcBody = '';
    let rpcAuth = '';
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get('authorization') ?? '';
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
      }
      if (url.includes('upload_rate_events')) {
        if ((init?.method ?? 'GET') === 'POST') {
          expect(authorization).toBe(`Bearer ${secret}`);
          expect(String(init?.body)).not.toContain(apiKey);
          return new Response(null, { status: 201 });
        }
        return new Response('[]', { status: 200, headers: { 'content-range': '*/0' } });
      }
      if (url.includes('/rpc/save_my_provider_key')) {
        rpcAuth = authorization;
        rpcBody = String(init?.body);
        return new Response(null, { status: 204 });
      }
      throw new Error(`unexpected ${url}`);
    };
    const response = await handleProviderKeys(new Request(`${supabaseUrl}/functions/v1/provider-keys`, {
      method: 'POST',
      headers: { authorization: 'Bearer user-jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', provider: 'openai', secret: apiKey }),
    }), { supabaseUrl, serviceRoleKey: secret, anonKey: anon, fetchImpl });
    spy.mockRestore();
    errorSpy.mockRestore();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toEqual({ saved: true, hint: '1234' });
    expect(rpcAuth).toBe('Bearer user-jwt');
    expect(rpcBody).toContain(apiKey);
    expect(logs.join('\n')).not.toContain(apiKey);
    expect(JSON.stringify(payload)).not.toContain(apiKey);
  });

  it('loads the saved key for the signed-in user and refuses a short key', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
      if (url.includes('/rpc/load_my_provider_key')) {
        return new Response(JSON.stringify({ secret: apiKey, key_hint: '1234' }), { status: 200 });
      }
      throw new Error(url);
    };
    const loaded = await handleProviderKeys(new Request(`${supabaseUrl}/functions/v1/provider-keys`, {
      method: 'POST',
      headers: { authorization: 'Bearer user-jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'load', provider: 'openai' }),
    }), { supabaseUrl, serviceRoleKey: secret, anonKey: anon, fetchImpl });
    expect(await loaded.json()).toEqual({ saved: true, hint: '1234', key: apiKey });

    const rejected = await handleProviderKeys(new Request(`${supabaseUrl}/functions/v1/provider-keys`, {
      method: 'POST',
      headers: { authorization: 'Bearer user-jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', provider: 'openai', secret: 'tiny' }),
    }), { supabaseUrl, serviceRoleKey: secret, anonKey: anon, fetchImpl });
    expect(rejected.status).toBe(400);
  });
});

describe('provider key migration', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/20261118002002_upload_archive_and_provider_keys.sql', import.meta.url), 'utf8');

  it('encrypts with pgcrypto and vault and checks auth.uid()', () => {
    expect(sql).toContain('extensions.pgp_sym_encrypt');
    expect(sql).toContain('extensions.pgp_sym_decrypt');
    expect(sql).toContain("name = 'provider_key_encryption'");
    expect(sql).toContain('p_user_id is distinct from auth.uid()');
    expect(sql).toContain('primary key (user_id, provider)');
    expect(sql).toContain('char_length(key_hint) = 4');
    expect(sql).toContain('grant select (user_id, provider, key_hint, created_at, updated_at)');
    expect(sql).not.toMatch(/for delete/i);
    expect(sql).not.toContain('PROVIDER_KEY_ENCRYPTION_SECRET=');
  });
});
