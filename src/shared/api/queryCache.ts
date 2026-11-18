import type { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { messengerApi } from './baseApi';
import { indexedStore, keepNewest, scopedKey, sessionScope } from './indexedStore';

export type CachedQuery = { endpointName: string; value: unknown; savedAt: number };

export interface QueryCacheStorage {
  load: (scope: string) => Promise<Map<string, CachedQuery>>;
  save: (scope: string, queryCacheKey: string, entry: CachedQuery) => void;
  remove: (scope: string, queryCacheKey: string) => void;
}

interface QueryCacheOptions {
  endpoints: readonly string[];
  storage?: QueryCacheStorage;
  readScope?: () => string | null;
  revalidateAfterMs?: number;
}

type QueryArg = { endpointName: string; queryCacheKey: string; originalArgs: unknown; subscribe?: boolean };
type QueryAction = { type: string; payload?: unknown; meta: { arg: QueryArg; condition?: boolean } };
type QueryEntry = { status?: string; data?: unknown; endpointName?: string };
type ApiState = { [messengerApi.reducerPath]: { queries: Record<string, QueryEntry | undefined> } };
type ApiDispatch = ThunkDispatch<ApiState, unknown, UnknownAction>;
type UpsertEntries = (entries: Array<{ endpointName: string; arg: unknown; value: unknown }>) => UnknownAction;
type Prefetch = (endpointName: string, arg: unknown, options: { ifOlderThan: number }) => (dispatch: ApiDispatch, getState: () => ApiState) => void;

const STORE = 'entries';
const MAX_ENTRIES = 300;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const REVALIDATE_AFTER_MS = 30_000;
const FORGET_STATUSES = new Set([401, 403, 404]);
const QUERY_PREFIX = `${messengerApi.reducerPath}/executeQuery/`;
const PENDING = `${QUERY_PREFIX}pending`;
const FULFILLED = `${QUERY_PREFIX}fulfilled`;
const REJECTED = `${QUERY_PREFIX}rejected`;

const upsertEntries = messengerApi.util.upsertQueryEntries as unknown as UpsertEntries;
const prefetch = messengerApi.util.prefetch as unknown as Prefetch;
const isPatch = messengerApi.internalActions.queryResultPatched.match;

const openDatabase = indexedStore('messenger-query-cache', STORE);

const parseKey = (key: IDBValidKey): [unknown, unknown] => {
  try {
    const parsed = JSON.parse(String(key)) as unknown;
    return Array.isArray(parsed) ? [parsed[0], parsed[1]] : [null, null];
  } catch {
    return [null, null];
  }
};

const withStore = (mode: IDBTransactionMode, scope: string, use: (store: IDBObjectStore) => void) => {
  void openDatabase().then((db) => {
    if (!db || sessionScope() !== scope) return;
    use(db.transaction(STORE, mode).objectStore(STORE));
  }).catch(() => undefined);
};

export const indexedQueryCacheStorage: QueryCacheStorage = {
  load: async (scope) => {
    const entries = new Map<string, CachedQuery>();
    const db = await openDatabase();
    if (!db) return entries;
    return new Promise((resolve) => {
      try {
        const request = db.transaction(STORE).objectStore(STORE).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(entries);
            return;
          }
          const [entryScope, key] = parseKey(cursor.key);
          const entry = cursor.value as CachedQuery | undefined;
          if (entryScope === scope && typeof key === 'string' && entry && Date.now() - entry.savedAt < MAX_AGE) entries.set(key, entry);
          cursor.continue();
        };
        request.onerror = () => resolve(entries);
      } catch {
        resolve(entries);
      }
    });
  },
  save: (scope, queryCacheKey, entry) => withStore('readwrite', scope, (store) => {
    store.put(entry, scopedKey(scope, queryCacheKey));
    keepNewest(store, MAX_ENTRIES);
  }),
  remove: (scope, queryCacheKey) => withStore('readwrite', scope, (store) => {
    store.delete(scopedKey(scope, queryCacheKey));
  }),
};

const queryActionOf = (action: unknown): QueryAction | null => {
  const candidate = action as Partial<QueryAction> | null;
  return typeof candidate?.type === 'string' && candidate.type.startsWith(QUERY_PREFIX) && candidate.meta?.arg ? candidate as QueryAction : null;
};

const statusOf = (payload: unknown) => {
  const status = (payload as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
};

export const createQueryCache = ({
  endpoints,
  storage = indexedQueryCacheStorage,
  readScope = sessionScope,
  revalidateAfterMs = REVALIDATE_AFTER_MS,
}: QueryCacheOptions) => {
  const cacheable = new Set(endpoints);
  let scope: string | null = null;
  let entries = new Map<string, CachedQuery>();
  let loaded: Promise<void> = Promise.resolve();

  const sync = () => {
    const next = readScope();
    if (next === scope) return loaded;
    scope = next;
    entries = new Map();
    if (!next) {
      loaded = Promise.resolve();
      return loaded;
    }
    const target = entries;
    loaded = storage.load(next).then((stored) => {
      stored.forEach((entry, key) => {
        if (!target.has(key)) target.set(key, entry);
      });
    }).catch(() => undefined);
    return loaded;
  };

  const middleware: Middleware<object, ApiState, ApiDispatch> = ({ dispatch, getState }) => next => (action) => {
    const query = queryActionOf(action);
    const queryCacheKey = query?.meta.arg.queryCacheKey ?? (isPatch(action) ? action.payload.queryCacheKey : null);
    const entryOf = () => (queryCacheKey ? getState()[messengerApi.reducerPath].queries[queryCacheKey] : undefined);
    const endpointName = query?.meta.arg.endpointName ?? entryOf()?.endpointName;
    if (!queryCacheKey || !endpointName || !cacheable.has(endpointName)) return next(action);
    sync();

    if (query?.type === PENDING && entryOf()?.data === undefined) {
      const stored = entries.get(queryCacheKey);
      if (stored?.endpointName === endpointName) {
        dispatch(upsertEntries([{ endpointName, arg: query.meta.arg.originalArgs, value: stored.value }]));
      }
    }

    const result = next(action);
    const entry = entryOf();

    if ((query?.type === FULFILLED || !query) && entry?.status === 'fulfilled' && entry.data !== undefined && scope) {
      const saved = { endpointName, value: entry.data, savedAt: Date.now() };
      entries.set(queryCacheKey, saved);
      storage.save(scope, queryCacheKey, saved);
    } else if (query?.type === REJECTED && query.meta.condition) {
      if (query.meta.arg.subscribe && entry?.status === 'fulfilled') {
        dispatch(prefetch(endpointName, query.meta.arg.originalArgs, { ifOlderThan: revalidateAfterMs / 1000 }));
      }
    } else if (query?.type === REJECTED && FORGET_STATUSES.has(statusOf(query.payload) ?? 0)) {
      entries.delete(queryCacheKey);
      if (scope) storage.remove(scope, queryCacheKey);
    }
    return result;
  };

  sync();
  return { middleware, sync };
};
