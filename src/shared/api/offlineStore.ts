import { useEffect, useState } from 'react';
import { indexedStore, keepNewest, scopedKey as storageKey, sessionScope } from './indexedStore';

const STORE = 'values';
const MAX_ENTRIES = 400;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const FORGET_STATUSES = new Set([401, 403, 404]);

const openDatabase = indexedStore('messenger-offline-store', STORE);

export async function readStored<T>(key: string): Promise<T | undefined> {
  const scope = sessionScope();
  const db = scope ? await openDatabase() : null;
  if (!db || !scope) return undefined;
  return new Promise<T | undefined>((resolve) => {
    try {
      const request = db.transaction(STORE).objectStore(STORE).get(storageKey(scope, key));
      request.onsuccess = () => {
        const entry = request.result as { value: T; savedAt: number } | undefined;
        resolve(entry && Date.now() - entry.savedAt < MAX_AGE && sessionScope() === scope ? entry.value : undefined);
      };
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function storeValue<T>(key: string, value: T) {
  const scope = sessionScope();
  const db = scope ? await openDatabase() : null;
  if (!db || !scope || scope !== sessionScope()) return;
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    store.put({ value, savedAt: Date.now() }, storageKey(scope, key));
    keepNewest(store, MAX_ENTRIES);
  } catch {
    return;
  }
}

export async function forgetStored(key: string) {
  const scope = sessionScope();
  const db = scope ? await openDatabase() : null;
  if (!db || !scope) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(storageKey(scope, key));
  } catch {
    return;
  }
}

const statusOf = (failure: unknown) => {
  const record = failure as { status?: unknown; error?: { status?: unknown }; response?: { status?: unknown } } | null;
  const status = record?.status ?? record?.error?.status ?? record?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

export async function withStoredFallback<T>(key: string, load: () => Promise<T>, read: (key: string) => Promise<T | undefined> = readStored): Promise<T> {
  try {
    const value = await load();
    void storeValue(key, value);
    return value;
  } catch (failure) {
    const status = statusOf(failure);
    if (status !== undefined && FORGET_STATUSES.has(status)) {
      void forgetStored(key);
      throw failure;
    }
    const stored = await read(key);
    if (stored === undefined) throw failure;
    return stored;
  }
}

export function useStoredValue<T>(key: string | null) {
  const scope = sessionScope();
  const [entry, setEntry] = useState<{ scope: string; key: string; value: T }>();
  useEffect(() => {
    if (!scope || !key) return;
    let active = true;
    void readStored<T>(key).then((value) => {
      if (active && value !== undefined) setEntry({ scope, key, value });
    });
    return () => { active = false; };
  }, [scope, key]);
  return entry?.scope === scope && entry?.key === key ? entry.value : undefined;
}

export const userByIdKey = (id: string | number) => `user:id:${id}`;
export const userByNameKey = (username: string) => `user:name:${username.toLowerCase()}`;
export const stickerPacksKey = 'sticker-packs';
export const recentStickersKey = 'sticker-recent';
