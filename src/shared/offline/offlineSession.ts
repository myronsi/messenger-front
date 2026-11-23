import { apiClient } from '@/shared/api/client';
import { sessionScope } from '@/shared/api/indexedStore';
import { contractData } from '@/shared/api/tasks';
import { subscribeToAccessToken } from '@/shared/auth/session';
import type { OfflineBackend } from './backend';
import { deriveOfflineKeys, type OfflineKeys } from './cipher';
import { deleteIdbDatabase, openIdbBackend } from './idbBackend';
import { createOfflineDb, type OfflineDb } from './offlineDb';
import { capBytes, getStorageCap } from './storageCap';

const KEYS = 'keys';
const ENFORCE_DELAY_MS = 5000;

type Opened = { scope: string; backend: Promise<OfflineBackend>; db: Promise<OfflineDb | null> };

let current: Opened | null = null;
let enforceTimer: ReturnType<typeof setTimeout> | undefined;
let initCursor: ((db: OfflineDb) => Promise<void>) | null = null;

const databaseName = async (scope: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
  return `messenger-offline-${[...new Uint8Array(digest, 0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

const fetchKeys = async () => {
  const { key } = contractData(await apiClient.POST('/me/storage-key', {}));
  return deriveOfflineKeys(key);
};

const openFor = (scope: string): Opened => {
  const backend = databaseName(scope).then(openIdbBackend);
  const db = backend.then(async (store) => {
    let keys = await store.getMeta<OfflineKeys>(KEYS);
    const fresh = !keys;
    if (!keys) {
      keys = await fetchKeys();
      await store.setMeta(KEYS, keys);
    }
    const opened = createOfflineDb(store, keys);
    if (fresh && initCursor) await initCursor(opened).catch(() => undefined);
    void navigator.storage?.persist?.().catch(() => false);
    return opened;
  }).catch(async () => {
    (await backend.catch(() => null))?.close();
    return null;
  });
  return { scope, backend, db };
};

const forget = (entry: Opened) => {
  void entry.backend.then(async (store) => {
    store.close();
    await deleteIdbDatabase(await databaseName(entry.scope));
  }).catch(() => undefined);
};

export const setOfflineCursorInit = (fn: (db: OfflineDb) => Promise<void>) => { initCursor = fn; };

export const getOfflineDb = (): Promise<OfflineDb | null> => {
  const scope = sessionScope();
  if (!scope) return Promise.resolve(null);
  if (current?.scope !== scope) {
    if (current) forget(current);
    current = openFor(scope);
  }
  const opened = current;
  return opened.db.then((db) => {
    if (!db && current === opened) current = null;
    return current === opened ? db : null;
  });
};

export const withOfflineDb = (fn: (db: OfflineDb) => Promise<unknown>) => {
  void getOfflineDb().then((db) => (db ? fn(db) : undefined)).catch(() => undefined);
};

export const enforceStorageCapSoon = () => {
  clearTimeout(enforceTimer);
  enforceTimer = setTimeout(() => withOfflineDb((db) => db.enforceCap(capBytes(getStorageCap()))), ENFORCE_DELAY_MS);
};

export const clearOfflineData = async () => {
  const db = await getOfflineDb();
  await db?.clearData();
  await db?.clearSealed();
  if (db && initCursor) await initCursor(db).catch(() => undefined);
};

subscribeToAccessToken(() => {
  const scope = sessionScope();
  if (current && current.scope !== scope) {
    forget(current);
    current = null;
  }
});
