import { bytesToHex, isSha256State, type Sha256State } from './sha256';

export interface ArchiveSession {
  path: string;
  filename: string;
  size: number;
  contentType: string;
  userId: string | null;
  exp: number;
  offset: number;
  hash: Sha256State;
  location: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealSession(session: ArchiveSession, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(session)),
  ));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToBase64Url(packed);
}

function isSession(value: unknown): value is ArchiveSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as ArchiveSession;
  return typeof session.path === 'string'
    && /^archive\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(session.path)
    && typeof session.filename === 'string'
    && Number.isInteger(session.size)
    && session.size > 0
    && typeof session.contentType === 'string'
    && (session.userId === null || typeof session.userId === 'string')
    && Number.isInteger(session.exp)
    && Number.isInteger(session.offset)
    && session.offset >= 0
    && typeof session.location === 'string'
    && isUploadLocation(session.location)
    && isSha256State(session.hash);
}

function isUploadLocation(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  } catch {
    return false;
  }
}

export async function openSession(token: string, secret: string, now: number): Promise<ArchiveSession | null> {
  try {
    const packed = base64UrlToBytes(token);
    if (packed.length < 13) return null;
    const key = await aesKey(secret);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.subarray(0, 12) },
      key,
      packed.subarray(12),
    );
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plain));
    if (!isSession(parsed) || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function subjectHash(kind: 'ip' | 'user' | 'key', value: string, secret: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${kind}:${secret}:${value}`),
  ));
  return `${kind}:${bytesToHex(digest).slice(0, 32)}`;
}
