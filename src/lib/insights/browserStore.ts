import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { DepthId } from './depth.ts';
import type { VaultStore } from './keyVault.ts';
import { LOCAL_READ_CLEARED_EVENT } from './localRead.ts';
import type { CaseFile } from './merge.ts';

const DB_NAME = 'chat-insights';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['meta', 'keys', 'checkpoints']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export function idbVaultStore(): VaultStore {
  return {
    async get(store, key) {
      const db = await openDb();
      return requestToPromise(db.transaction(store, 'readonly').objectStore(store).get(key));
    },
    async put(store, key, value) {
      const db = await openDb();
      await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
    },
    async delete(store, key) {
      const db = await openDb();
      await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key));
    },
    async keys(store) {
      const db = await openDb();
      const result = await requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAllKeys());
      return result.map((key) => String(key));
    },
  };
}

export interface LocalCheckpoint {
  fingerprint: string;
  filename: string;
  depth: DepthId;
  provider: string;
  model: string;
  conversations: NormalizedConversation[];
  readIds: string[];
  caseFile?: CaseFile;
  updatedAt: string;
  /** Account that produced the read. Null means it was anonymous and may be adopted by a new account. */
  ownerId?: string | null;
}

export async function saveCheckpoint(checkpoint: LocalCheckpoint): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction('checkpoints', 'readwrite').objectStore('checkpoints').put(checkpoint, 'current'));
}

export async function loadCheckpoint(): Promise<LocalCheckpoint | null> {
  const db = await openDb();
  const value = await requestToPromise(db.transaction('checkpoints', 'readonly').objectStore('checkpoints').get('current'));
  return (value as LocalCheckpoint | undefined) ?? null;
}

export async function clearCheckpoint(): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction('checkpoints', 'readwrite').objectStore('checkpoints').delete('current'));
}

export function notifyLocalReadCleared(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LOCAL_READ_CLEARED_EVENT));
}

export function subscribeLocalReadCleared(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => listener();
  window.addEventListener(LOCAL_READ_CLEARED_EVENT, handler);
  return () => window.removeEventListener(LOCAL_READ_CLEARED_EVENT, handler);
}

/** Drop the on-device case file and tell open pages to forget it. Saved keys and saved account reports stay. */
export async function clearLocalRead(): Promise<void> {
  try {
    await clearCheckpoint();
  } catch {
    // Still tell the page to drop its copy. A locked database should not keep the case file on screen.
  }
  notifyLocalReadCleared();
}
