import type { NormalizedConversation } from '../conversationParser/types.ts';
import type { DepthId } from './depth.ts';
import type { VaultStore } from './keyVault.ts';
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
