import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { archiveExportFile } from './client';
import { handleArchiveUpload } from './handler';
import {
  canonicalContentType,
  forbiddenField,
  isSampleRead,
  rateLimitAllows,
  validateArchiveStart,
} from './policy';
import { sha256Hex } from './sha256';
import { openSession, sealSession } from './token';

const secret = 'service-role-test-key';
const anon = 'anon-test-key';
const supabaseUrl = 'https://yaykfgyucipnqufydyjb.supabase.co';

function nodeSha(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('archive policy', () => {
  it('accepts export types and rejects other content', () => {
    expect(canonicalContentType('conversations.json', 'application/json')).toBe('application/json');
    expect(canonicalContentType('takeout.html', '')).toBe('text/html');
    expect(canonicalContentType('notes.zip', 'application/zip')).toBe('application/zip');
    expect(canonicalContentType('photo.png', 'image/png')).toBeNull();
    expect(canonicalContentType('chat.json', 'text/html')).toBeNull();
    expect(validateArchiveStart({ filename: 'a.json', size: 0, contentType: 'application/json' })).toMatch(/empty/);
    expect(validateArchiveStart({ filename: 'a.json', size: 200 * 1024 * 1024 + 1, contentType: 'application/json' })).toMatch(/200MB/);
  });

  it('does not archive the sample and refuses key fields', () => {
    expect(isSampleRead('?sample=1')).toBe(true);
    expect(isSampleRead('sample=0')).toBe(false);
    expect(forbiddenField(['file', 'apiKey'])).toMatch(/Provider keys/);
    expect(rateLimitAllows(5)).toBe(true);
    expect(rateLimitAllows(6)).toBe(false);
  });

  it('hashes incrementally the same way as node crypto', () => {
    const bytes = new Uint8Array(200);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 251;
    expect(sha256Hex(bytes)).toBe(nodeSha(bytes));
    expect(sha256Hex(new Uint8Array())).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('seals the upload session so the client cannot read the storage URL', async () => {
    const token = await sealSession({
      path: 'archive/11111111-1111-4111-8111-111111111111',
      filename: 'chat.json',
      size: 4,
      contentType: 'application/json',
      userId: null,
      exp: Date.now() + 1000,
      offset: 0,
      hash: { h: [1, 2, 3, 4, 5, 6, 7, 8], buffer: [], bytes: 0 },
      location: 'https://storage.example.test/upload/1',
    }, secret);
    expect(token).not.toContain('storage.example');
    expect(await openSession(`${token.slice(0, -2)}aa`, secret, Date.now())).toBeNull();
    expect((await openSession(token, secret, Date.now()))?.location).toContain('storage.example');
  });
});

describe('archive upload', () => {
  it('stores the original bytes through the function and records metadata', async () => {
    const bytes = new Uint8Array(7 * 1024 * 1024);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 17) % 256;
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });
    const patches: Uint8Array[] = [];
    let row: Record<string, unknown> | null = null;
    const outbound: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const authorization = new Headers(init?.headers).get('authorization') ?? '';
      if (url.includes('/auth/v1/user')) {
        expect(authorization).toBe('Bearer user-jwt');
        return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
      }
      if (url.includes('/storage/v1/upload/resumable') && method === 'POST') {
        expect(authorization).toBe(`Bearer ${secret}`);
        expect(new Headers(init?.headers).get('upload-length')).toBe(String(bytes.length));
        return new Response(null, { status: 201, headers: { location: 'https://storage.example.test/upload/1' } });
      }
      if (url === 'https://storage.example.test/upload/1') {
        expect(authorization).toBe(`Bearer ${secret}`);
        const chunk = new Uint8Array(await new Response(init?.body).arrayBuffer());
        patches.push(chunk);
        const offset = Number(new Headers(init?.headers).get('upload-offset'));
        return new Response(null, { status: 204, headers: { 'upload-offset': String(offset + chunk.length) } });
      }
      if (url.includes('/rest/v1/upload_rate_events')) {
        expect(authorization).toBe(`Bearer ${secret}`);
        if (method === 'POST') return new Response(null, { status: 201 });
        return new Response('[]', { status: 200, headers: { 'content-range': '*/0' } });
      }
      if (url.includes('/rest/v1/upload_archive')) {
        row = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(JSON.stringify(row)).not.toContain('sk-live');
        return new Response(JSON.stringify([{ id: 'archive-1' }]), { status: 201, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`unexpected ${method} ${url}`);
    };
    const inbound: typeof fetch = (input, init) => handleArchiveUpload(new Request(input, init), {
      supabaseUrl,
      serviceRoleKey: secret,
      anonKey: anon,
      fetchImpl: outbound,
      now: () => Date.parse('2026-11-18T00:00:00Z'),
    });
    const saved = await archiveExportFile({
      filename: 'conversations.json',
      bytes,
      contentType: 'application/json',
      metadata: Promise.resolve({ detectedFormat: 'ChatGPT', conversationCount: 12 }),
      supabaseUrl,
      anonKey: anon,
      accessToken: 'user-jwt',
      fetchImpl: inbound,
    });
    spy.mockRestore();
    expect(saved).toEqual({ id: 'archive-1' });
    const stored = new Uint8Array(patches.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of patches) {
      stored.set(chunk, offset);
      offset += chunk.length;
    }
    expect(Array.from(stored)).toEqual(Array.from(bytes));
    expect(row).toMatchObject({
      user_id: 'user-1',
      original_filename: 'conversations.json',
      size_bytes: bytes.length,
      sha256: nodeSha(bytes),
      detected_format: 'ChatGPT',
      conversation_count: 12,
    });
    expect(logs.join('\n')).not.toContain(secret);
  });

  it('rejects a provider key and does not open storage', async () => {
    const outbound = vi.fn<typeof fetch>();
    const response = await handleArchiveUpload(new Request(`${supabaseUrl}/functions/v1/archive-upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${anon}`, apikey: anon },
      body: JSON.stringify({ action: 'start', filename: 'a.json', size: 10, contentType: 'application/json', apiKey: 'sk-live' }),
    }), {
      supabaseUrl,
      serviceRoleKey: secret,
      anonKey: anon,
      fetchImpl: outbound,
    });
    expect(response.status).toBe(400);
    expect(outbound).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/Provider keys/) });
  });

  it('rate limits before storing', async () => {
    const outbound: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({}), { status: 401 });
      if (url.includes('upload_rate_events')) {
        return new Response('[]', { status: 200, headers: { 'content-range': '*/6' } });
      }
      throw new Error(`unexpected ${String(input)} ${init?.method}`);
    };
    const response = await handleArchiveUpload(new Request(`${supabaseUrl}/functions/v1/archive-upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${anon}` },
      body: JSON.stringify({ action: 'start', filename: 'a.json', size: 10, contentType: 'application/json' }),
    }), { supabaseUrl, serviceRoleKey: secret, anonKey: anon, fetchImpl: outbound });
    expect(response.status).toBe(429);
  });
});

describe('archive migration', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/20261118002002_upload_archive_and_provider_keys.sql', import.meta.url), 'utf8');

  it('keeps the bucket private and gives clients no archive access', () => {
    expect(sql).toContain("values (\n  'upload-archive'");
    expect(sql).toMatch(/'upload-archive',\s*\n\s*'upload-archive',\s*\n\s*false/);
    expect(sql).toContain('alter table public.upload_archive enable row level security');
    expect(sql).toContain('revoke all on table public.upload_archive from public, anon, authenticated, service_role');
    expect(sql).toContain('as restrictive');
    expect(sql).not.toMatch(/create policy[^;]+on public\.upload_archive/i);
    expect(sql).not.toMatch(/for delete/i);
  });
});
