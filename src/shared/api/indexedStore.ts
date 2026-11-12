import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSession, getTokenSubject } from '@/shared/auth/tokenClaims';
import { getApiBaseUrl } from './config';

export const sessionScope = () => {
  const token = getAccessToken();
  const account = getTokenSubject(token);
  const session = getTokenSession(token);
  return account && session ? JSON.stringify([getApiBaseUrl(), account, session]) : null;
};

export const scopedKey = (scope: string, key: string) => JSON.stringify([scope, key]);

export const indexedStore = (name: string, store: string) => {
  let database: Promise<IDBDatabase | null> | undefined;
  const open = () => database ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store).createIndex('savedAt', 'savedAt');
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  }).catch(() => null);

  let previousScope = sessionScope();
  subscribeToAccessToken(() => {
    const nextScope = sessionScope();
    if (previousScope && previousScope !== nextScope) {
      void open().then((db) => {
        if (db) db.transaction(store, 'readwrite').objectStore(store).clear();
      }).catch(() => undefined);
    }
    previousScope = nextScope;
  });

  return open;
};

export const keepNewest = (store: IDBObjectStore, maxEntries: number) => {
  const keys = store.index('savedAt').getAllKeys();
  keys.onsuccess = () => {
    for (const old of keys.result.slice(0, Math.max(0, keys.result.length - maxEntries))) store.delete(old);
  };
};
