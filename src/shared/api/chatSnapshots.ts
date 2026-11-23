import { useEffect, useState } from 'react';
import { indexedStore, keepNewest, scopedKey as storageKey, sessionScope } from './indexedStore';
import { isHistoryKey } from './historySnapshotRules';

const STORE = 'snapshots';
const MAX_ENTRIES = 150;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const openDatabase = indexedStore('messenger-chat-snapshots', STORE);

type Snapshot<T> = { value: T; savedAt: number };

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

const innerKey = (storedKey: IDBValidKey) => {
  try {
    return String((JSON.parse(String(storedKey)) as unknown[])[1]);
  } catch {
    return '';
  }
};

const writeSnapshot = async <T>(scope: string, key: string, data: T) => {
  const db = await openDatabase();
  if (!db || scope !== sessionScope()) return;
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  store.put({ value: data, savedAt: Date.now() }, storageKey(scope, key));
  keepNewest(store, MAX_ENTRIES);
};

export const dropHistorySnapshots = async () => {
  const db = await openDatabase();
  if (!db) return;
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  const keys = store.getAllKeys();
  keys.onsuccess = () => keys.result.filter((key) => isHistoryKey(innerKey(key))).forEach((key) => store.delete(key));
};

export async function saveChatSnapshot<T>(key: string, data: T) {
  const scope = sessionScope();
  if (!scope) return;
  try {
    await writeSnapshot(scope, key, data);
  } catch {
    return;
  }
}

export async function rememberChatSnapshot<T>(key: string, result: Promise<{ data: T }>) {
  const scope = sessionScope();
  try {
    const { data } = await result;
    if (!scope) return;
    await writeSnapshot(scope, key, data);
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

export const directChatsSnapshot = 'direct-chats';
export const groupChatsSnapshot = 'group-chats';

void dropHistorySnapshots().catch(() => undefined);
