import { useEffect, useState } from 'react';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSession, getTokenSubject } from '@/shared/auth/tokenClaims';
import { getApiBaseUrl } from './config';

const STORE = 'snapshots';
const MAX_ENTRIES = 32;
const MAX_AGE = 24 * 60 * 60 * 1000;
const sessionScope = () => {
  const token = getAccessToken();
  const account = getTokenSubject(token);
  const session = getTokenSession(token);
  return account && session ? JSON.stringify([getApiBaseUrl(), account, session]) : null;
};

let database: Promise<IDBDatabase | null> | undefined;
function openDatabase() {
  return database ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open('messenger-chat-snapshots', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE).createIndex('savedAt', 'savedAt');
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  }).catch(() => null);
}

type Snapshot<T> = { value: T; savedAt: number };
const storageKey = (scope: string, key: string) => JSON.stringify([scope, key]);

async function readSnapshot<T>(scope: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  if (!db || sessionScope() !== scope) return;
  return new Promise<T | undefined>((resolve) => {
    const request = db.transaction(STORE).objectStore(STORE).get(storageKey(scope, key));
    request.onsuccess = () => {
      const entry = request.result as Snapshot<T> | undefined;
      resolve(entry && Date.now() - entry.savedAt < MAX_AGE && sessionScope() === scope ? entry.value : undefined);
    };
    request.onerror = () => resolve(undefined);
  });
}

export async function rememberChatSnapshot<T>(key: string, result: Promise<{ data: T }>) {
  const scope = sessionScope();
  try {
    const { data } = await result;
    if (!scope) return;
    const db = await openDatabase();
    if (!db || scope !== sessionScope()) return;
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    store.put({ value: data, savedAt: Date.now() }, storageKey(scope, key));
    const keys = store.index('savedAt').getAllKeys();
    keys.onsuccess = () => {
      for (const old of keys.result.slice(0, Math.max(0, keys.result.length - MAX_ENTRIES))) store.delete(old);
    };
  } catch (failure) {
    const error = (failure as { error?: { status?: number } })?.error;
    if (scope && (error?.status === 401 || error?.status === 403 || error?.status === 404)) {
      const db = await openDatabase();
      try {
        if (db) db.transaction(STORE, 'readwrite').objectStore(STORE).delete(storageKey(scope, key));
      } catch {
        // Storage is optional.
      }
    }
  }
}

export function useChatSnapshot<T>(key: string | null) {
  const scope = sessionScope();
  const [snapshot, setSnapshot] = useState<{ scope: string; key: string; value: T }>();
  useEffect(() => {
    if (!scope || !key) return;
    let active = true;
    void readSnapshot<T>(scope, key).then(value => {
      if (active && value !== undefined) setSnapshot({ scope, key, value });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [scope, key]);
  return snapshot?.scope === scope && snapshot?.key === key ? snapshot.value : undefined;
}

let previousScope = sessionScope();
subscribeToAccessToken(() => {
  const nextScope = sessionScope();
  if (previousScope && previousScope !== nextScope) {
    // Opening the database also removes snapshots left by a previous app run on logout.
    void openDatabase().then(db => {
      if (db) db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
    }).catch(() => undefined);
  }
  previousScope = nextScope;
});

export const directChatsSnapshot = 'direct-chats';
export const groupChatsSnapshot = 'group-chats';
export const historySnapshot = (chatId: string | number, aroundId?: string | number | null) =>
  JSON.stringify(['history', String(chatId), aroundId ? String(aroundId) : null]);
