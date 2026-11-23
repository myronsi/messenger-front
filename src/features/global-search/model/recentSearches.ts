import { useCallback, useEffect, useState } from 'react';
import { sessionScope } from '@/shared/api/indexedStore';
import { getOfflineDb } from '@/shared/offline';

const KEY = 'recent-searches';
export const MAX_RECENT_SEARCHES = 10;

const memory = new Map<string, string[]>();
const memoryKey = () => sessionScope() ?? '';

const openDb = () => getOfflineDb().catch(() => null);

export const loadRecentSearches = async (): Promise<string[]> => {
  const db = await openDb();
  if (!db) return memory.get(memoryKey()) ?? [];
  return (await db.getSealed<string[]>(KEY).catch(() => undefined)) ?? [];
};

const saveRecentSearches = async (items: string[]) => {
  const db = await openDb();
  if (!db) {
    memory.set(memoryKey(), items);
    return;
  }
  await db.setSealed(KEY, items).catch(() => undefined);
};

export const rememberSearch = async (query: string) => {
  const text = query.trim();
  const current = await loadRecentSearches();
  if ([...text].length < 2) return current;
  const lower = text.toLocaleLowerCase();
  const items = [text, ...current.filter((item) => item.toLocaleLowerCase() !== lower)].slice(0, MAX_RECENT_SEARCHES);
  await saveRecentSearches(items);
  return items;
};

export const clearRecentSearches = () => saveRecentSearches([]);

export const useRecentSearches = () => {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void loadRecentSearches().then((loaded) => { if (active) setItems(loaded); });
    return () => { active = false; };
  }, []);
  const remember = useCallback((query: string) => { void rememberSearch(query).then(setItems); }, []);
  const clear = useCallback(() => {
    setItems([]);
    void clearRecentSearches();
  }, []);
  return { items, remember, clear };
};
