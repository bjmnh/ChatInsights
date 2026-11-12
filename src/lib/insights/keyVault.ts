export interface VaultStore {
  get(store: string, key: string): Promise<unknown>;
  put(store: string, key: string, value: unknown): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  keys(store: string): Promise<string[]>;
}

export function memoryVaultStore(): VaultStore {
  const maps = new Map<string, Map<string, unknown>>();
  const bucket = (store: string) => {
    let map = maps.get(store);
    if (!map) {
      map = new Map();
      maps.set(store, map);
    }
    return map;
  };
  return {
    get: async (store, key) => bucket(store).get(key),
    put: async (store, key, value) => {
      bucket(store).set(key, value);
    },
    delete: async (store, key) => {
      bucket(store).delete(key);
    },
    keys: async (store) => [...bucket(store).keys()],
  };
}

export const DEFAULT_PBKDF2_ITERATIONS = 100_000;

export interface StoredKey {
  id: string;
  provider: string;
  label: string;
  lastUsed: string;
  iv: string;
  ciphertext: string;
  kdf: 'device' | 'passphrase';
  salt?: string;
  iterations?: number;
}

export interface KeySummary {
  id: string;
  provider: string;
  label: string;
  lastUsed: string;
  locked: boolean;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deviceKey(store: VaultStore): Promise<CryptoKey> {
  const existing = await store.get('meta', 'device-key');
  if (existing && typeof existing === 'object' && 'type' in (existing as CryptoKey)) {
    return existing as CryptoKey;
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await store.put('meta', 'device-key', key);
  return key;
}

async function passphraseKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(key: CryptoKey, secret: string): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(secret));
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

async function decrypt(key: CryptoKey, record: StoredKey): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(record.iv) as BufferSource },
    key,
    base64ToBytes(record.ciphertext) as BufferSource,
  );
  return textDecoder.decode(plain);
}

export async function rememberKey(
  store: VaultStore,
  input: { provider: string; label: string; secret: string; passphrase?: string; iterations?: number },
): Promise<KeySummary> {
  if (!input.secret.trim()) throw new Error('Missing key');
  const id = crypto.randomUUID();
  const passphrase = input.passphrase?.trim();
  let kdf: StoredKey['kdf'] = 'device';
  let wrapping: CryptoKey;
  let salt: string | undefined;
  let iterations: number | undefined;
  if (passphrase) {
    kdf = 'passphrase';
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    iterations = input.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
    wrapping = await passphraseKey(passphrase, saltBytes, iterations);
    salt = bytesToBase64(saltBytes);
  } else {
    wrapping = await deviceKey(store);
  }
  const sealed = await encrypt(wrapping, input.secret.trim());
  const record: StoredKey = {
    id,
    provider: input.provider,
    label: input.label.trim() || input.provider,
    lastUsed: new Date().toISOString(),
    iv: sealed.iv,
    ciphertext: sealed.ciphertext,
    kdf,
    salt,
    iterations,
  };
  await store.put('keys', id, record);
  return { id, provider: record.provider, label: record.label, lastUsed: record.lastUsed, locked: kdf === 'passphrase' };
}

export async function listKeys(store: VaultStore): Promise<KeySummary[]> {
  const ids = await store.keys('keys');
  const summaries: KeySummary[] = [];
  for (const id of ids) {
    const record = await store.get('keys', id);
    if (!record || typeof record !== 'object') continue;
    const stored = record as StoredKey;
    summaries.push({
      id: stored.id,
      provider: stored.provider,
      label: stored.label,
      lastUsed: stored.lastUsed,
      locked: stored.kdf === 'passphrase',
    });
  }
  return summaries.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}

export async function revealKey(store: VaultStore, id: string, passphrase?: string): Promise<string> {
  const record = await store.get('keys', id) as StoredKey | undefined;
  if (!record) throw new Error('No saved key with that id');
  if (record.kdf === 'passphrase') {
    if (!passphrase) throw new Error('This key is locked with a passphrase');
    if (!record.salt || !record.iterations) throw new Error('Saved key is missing its salt');
    const key = await passphraseKey(passphrase, base64ToBytes(record.salt), record.iterations);
    return decrypt(key, record);
  }
  return decrypt(await deviceKey(store), record);
}

export async function forgetKey(store: VaultStore, id: string): Promise<void> {
  await store.delete('keys', id);
}

export async function forgetAllKeys(store: VaultStore): Promise<void> {
  const ids = await store.keys('keys');
  await Promise.all(ids.map((id) => store.delete('keys', id)));
}

export async function touchKey(store: VaultStore, id: string): Promise<void> {
  const record = await store.get('keys', id) as StoredKey | undefined;
  if (!record) return;
  record.lastUsed = new Date().toISOString();
  await store.put('keys', id, record);
}
