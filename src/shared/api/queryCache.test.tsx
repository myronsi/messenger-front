import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messengerApi } from './baseApi';
import { createQueryCache, type CachedQuery, type QueryCacheStorage } from './queryCache';

type Settings = { theme: string };

const responses: Array<() => Promise<{ data: Settings } | { error: { status: number; data: unknown } }>> = [];
const loadSettings = vi.fn(() => (responses.shift() ?? (async () => ({ data: { theme: 'fresh' } })))());

const testApi = messengerApi.injectEndpoints({
  endpoints: build => ({
    cacheProbe: build.query<Settings, string>({ queryFn: () => loadSettings() }),
    plainProbe: build.query<Settings, string>({ queryFn: () => loadSettings() }),
  }),
});

const memoryStorage = (seed: Record<string, Record<string, CachedQuery>> = {}) => {
  const data = new Map(Object.entries(seed).map(([scope, entries]) => [scope, new Map(Object.entries(entries))]));
  const storage: QueryCacheStorage = {
    load: async scope => new Map(data.get(scope) ?? []),
    save: vi.fn((scope, key, entry) => {
      const entries = data.get(scope) ?? new Map<string, CachedQuery>();
      entries.set(key, entry);
      data.set(scope, entries);
    }),
    remove: vi.fn((scope, key) => { data.get(scope)?.delete(key); }),
  };
  return { storage, data };
};

const setup = async (seed?: Record<string, Record<string, CachedQuery>>, scope = 'scope-a') => {
  const { storage, data } = memoryStorage(seed);
  let currentScope: string | null = scope;
  const cache = createQueryCache({ endpoints: ['cacheProbe'], storage, readScope: () => currentScope, revalidateAfterMs: 30_000 });
  await cache.sync();
  const store = configureStore({
    reducer: { [messengerApi.reducerPath]: messengerApi.reducer },
    middleware: getDefault => getDefault().concat(cache.middleware, messengerApi.middleware),
  });
  return { store, storage, data, cache, setScope: (next: string | null) => { currentScope = next; } };
};

const key = (arg: string) => `cacheProbe("${arg}")`;
const saved = (theme: string, endpointName = 'cacheProbe'): CachedQuery => ({ endpointName, value: { theme }, savedAt: Date.now() });
const deferred = () => {
  let resolve: (value: { data: Settings }) => void = () => undefined;
  const promise = new Promise<{ data: Settings }>((done) => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => {
  responses.length = 0;
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('query cache', () => {
  it('shows the stored value while the request runs and replaces it with the server answer', async () => {
    const { store } = await setup({ 'scope-a': { [key('me')]: saved('stored') } });
    const request = deferred();
    responses.push(() => request.promise);

    const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
    const { result, unmount } = renderHook(() => testApi.useCacheProbeQuery('me'), { wrapper });
    expect(result.current.data).toEqual({ theme: 'stored' });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);

    await act(async () => { request.resolve({ data: { theme: 'fresh' } }); });
    await waitFor(() => expect(result.current.data).toEqual({ theme: 'fresh' }));
    expect(result.current.isFetching).toBe(false);
    unmount();
  });

  it('saves every answer so the next start can show it', async () => {
    const { store, data } = await setup();
    const running = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await running;
    expect(data.get('scope-a')?.get(key('me'))).toMatchObject({ endpointName: 'cacheProbe', value: { theme: 'fresh' } });
    running.unsubscribe();
  });

  it('saves local patches of a cached entry', async () => {
    const { store, data } = await setup();
    const running = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await running;
    store.dispatch(testApi.util.updateQueryData('cacheProbe', 'me', (draft) => { draft.theme = 'patched'; }));
    expect(data.get('scope-a')?.get(key('me'))?.value).toEqual({ theme: 'patched' });
    running.unsubscribe();
  });

  it('forgets the stored value when the server says it is gone', async () => {
    const { store, data, storage } = await setup({ 'scope-a': { [key('me')]: saved('stored') } });
    responses.push(async () => ({ error: { status: 404, data: null } }));
    const running = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await running;
    expect(storage.remove).toHaveBeenCalledWith('scope-a', key('me'));
    expect(data.get('scope-a')?.has(key('me'))).toBe(false);
    running.unsubscribe();
  });

  it('keeps the stored value when only the network fails', async () => {
    const { store, storage } = await setup({ 'scope-a': { [key('me')]: saved('stored') } });
    responses.push(async () => ({ error: { status: 500, data: null } }));
    const running = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await running;
    expect(storage.remove).not.toHaveBeenCalled();
    expect(testApi.endpoints.cacheProbe.select('me')(store.getState()).data).toEqual({ theme: 'stored' });
    running.unsubscribe();
  });

  it('refreshes in the background when a screen opens on data older than the limit', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { store } = await setup();
    const first = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await first;
    expect(loadSettings).toHaveBeenCalledTimes(1);

    const early = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await early;
    expect(loadSettings).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 31_000);
    responses.push(async () => ({ data: { theme: 'changed' } }));
    const late = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    await vi.waitFor(() => expect(testApi.endpoints.cacheProbe.select('me')(store.getState()).data).toEqual({ theme: 'changed' }));
    expect(loadSettings).toHaveBeenCalledTimes(2);
    [first, early, late].forEach(subscription => subscription.unsubscribe());
  });

  it('never shows values of another session or of endpoints that are not listed', async () => {
    const { store } = await setup({
      'scope-b': { [key('me')]: saved('other account') },
      'scope-a': { 'plainProbe("me")': saved('plain', 'plainProbe') },
    });
    const request = deferred();
    responses.push(() => request.promise);
    const cached = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    expect(testApi.endpoints.cacheProbe.select('me')(store.getState()).data).toBeUndefined();
    const second = deferred();
    responses.push(() => second.promise);
    const plain = store.dispatch(testApi.endpoints.plainProbe.initiate('me'));
    expect(testApi.endpoints.plainProbe.select('me')(store.getState()).data).toBeUndefined();
    request.resolve({ data: { theme: 'fresh' } });
    second.resolve({ data: { theme: 'fresh' } });
    await Promise.all([cached, plain]);
    [cached, plain].forEach(subscription => subscription.unsubscribe());
  });

  it('drops values in memory when the session changes', async () => {
    const { store, setScope, cache } = await setup({ 'scope-a': { [key('me')]: saved('stored') } });
    setScope(null);
    await cache.sync();
    const request = deferred();
    responses.push(() => request.promise);
    const running = store.dispatch(testApi.endpoints.cacheProbe.initiate('me'));
    expect(testApi.endpoints.cacheProbe.select('me')(store.getState()).data).toBeUndefined();
    request.resolve({ data: { theme: 'fresh' } });
    await running;
    running.unsubscribe();
  });
});
