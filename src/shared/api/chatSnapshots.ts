import { useEffect, useState } from 'react';
import { indexedStore, keepNewest, scopedKey as storageKey, sessionScope } from './indexedStore';
import { historyLimitForRank, isHistoryKey, mergeHistoryPages, trimHistory, type HistoryPageLike } from './historySnapshotRules';

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

const trimOlderHistories = (store: IDBObjectStore) => {
  let rank = 0;
  const cursor = store.index('savedAt').openCursor(null, 'prev');
  cursor.onsuccess = () => {
    const current = cursor.result;
    if (!current) return;
    if (isHistoryKey(innerKey(current.primaryKey))) {
      const entry = current.value as Snapshot<HistoryPageLike>;
      const trimmed = trimHistory(entry.value, historyLimitForRank(rank));
      if (trimmed !== entry.value) current.update({ ...entry, value: trimmed });
      rank += 1;
    }
    current.continue();
  };
};

const writeSnapshot = async <T>(scope: string, key: string, data: T) => {
  const db = await openDatabase();
  if (!db || scope !== sessionScope()) return;
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  const save = (value: unknown) => {
    store.put({ value, savedAt: Date.now() }, storageKey(scope, key));
    keepNewest(store, MAX_ENTRIES);
    if (isHistoryKey(key)) trimOlderHistories(store);
  };
  if (!isHistoryKey(key)) return save(data);
  const existing = store.get(storageKey(scope, key));
  existing.onsuccess = () => {
    const entry = existing.result as Snapshot<HistoryPageLike> | undefined;
    const fresh = entry && Date.now() - entry.savedAt < MAX_AGE ? entry.value : undefined;
    save(mergeHistoryPages(fresh, data as unknown as HistoryPageLike));
  };
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
export const historySnapshot = (chatId: string | number, aroundId?: string | number | null) =>
  JSON.stringify(['history', String(chatId), aroundId ? String(aroundId) : null]);
