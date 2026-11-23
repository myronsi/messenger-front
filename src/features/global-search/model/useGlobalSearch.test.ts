import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalSearchArgs, GlobalSearchFilters, GlobalSearchHit, GlobalSearchKind } from '@/entities/message';

const api = vi.hoisted(() => ({ local: vi.fn(), remote: vi.fn() }));
vi.mock('@/entities/message', () => ({
  isUnreachable: (error: { status?: unknown } | undefined) => ['FETCH_ERROR', 502, 503, 504].includes(error?.status as string),
  searchMessagesLocal: api.local,
  searchMessagesRemote: api.remote,
  globalSearchText: (message: { content: unknown }) => (typeof message.content === 'string' ? message.content : ''),
}));

const { useGlobalSearch, SEARCH_DEBOUNCE_MS } = await import('./useGlobalSearch');

const hit = (chatId: string, id: string, highlight: string | null = null) => ({
  chatId, highlight, message: { id, content: `message ${id}`, sender: 'Alice', timestamp: '', type: 'message', read_by: [] },
}) as GlobalSearchHit;
const ids = (hits: GlobalSearchHit[]) => hits.map((found) => `${found.chatId}:${String(found.message.id)}`);
const page = (items: GlobalSearchHit[], nextCursor: string | null = null) => ({ data: { items, nextCursor } });

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

interface Props { query: string; kind?: GlobalSearchKind; filters: GlobalSearchFilters }
const NO_FILTERS: GlobalSearchFilters = {};
const mount = (props: Props) => renderHook((current: Props) => useGlobalSearch(current), { initialProps: props });
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });

beforeEach(() => {
  vi.useFakeTimers();
  api.local.mockReset().mockResolvedValue([]);
  api.remote.mockReset().mockResolvedValue(page([]));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('global search hook', () => {
  it('shows local hits first, then merges server hits without duplicates, newest first', async () => {
    const server = deferred<ReturnType<typeof page>>();
    api.local.mockResolvedValue([hit('1', '30'), hit('2', '10')]);
    api.remote.mockReturnValue(server.promise);
    const { result } = mount({ query: 'trip', filters: NO_FILTERS });
    await settle();
    expect(ids(result.current.hits)).toEqual(['1:30', '2:10']);
    expect(result.current.loading).toBe(true);
    await act(async () => { server.resolve(page([hit('3', '200'), hit('1', '30', 'a trip')], 'next')); });
    expect(ids(result.current.hits)).toEqual(['3:200', '1:30', '2:10']);
    expect(result.current.hits[1].highlight).toBe('a trip');
    expect(result.current).toMatchObject({ loading: false, localOnly: false, hasMore: true });
  });

  it('waits until typing stops and searches only the last words', async () => {
    const { rerender } = mount({ query: 'tr', filters: NO_FILTERS });
    rerender({ query: 'tri', filters: NO_FILTERS });
    rerender({ query: 'trip', filters: NO_FILTERS });
    await settle();
    expect(api.remote).toHaveBeenCalledTimes(1);
    expect(api.remote.mock.calls[0][0]).toMatchObject({ q: 'trip' });
  });

  it('does not search one letter, and lists a kind without words', async () => {
    const { rerender, result } = mount({ query: 't', filters: NO_FILTERS });
    await settle();
    expect(result.current.active).toBe(false);
    expect(api.remote).not.toHaveBeenCalled();
    rerender({ query: '', kind: 'visual', filters: NO_FILTERS });
    await settle();
    expect(api.remote.mock.calls[0][0]).toMatchObject({ q: '', kind: 'visual' });
  });

  it('sends kind and filters to the server and to the device search', async () => {
    const filters = { chatId: '4', senderId: '7', type: 'file' as const, from: '2026-11-01T00:00:00.000Z' };
    mount({ query: 'plan', kind: 'file', filters });
    await settle();
    const expected = { q: 'plan', kind: 'file', filters };
    expect(api.local.mock.calls[0][0] as GlobalSearchArgs).toMatchObject(expected);
    expect(api.remote.mock.calls[0][0] as GlobalSearchArgs).toMatchObject(expected);
  });

  it('shows only device results with a note when the server cannot be reached', async () => {
    api.local.mockResolvedValue([hit('1', '5')]);
    api.remote.mockResolvedValue({ error: { status: 503 } });
    const { result } = mount({ query: 'trip', filters: NO_FILTERS });
    await settle();
    await act(async () => { await Promise.resolve(); });
    expect(ids(result.current.hits)).toEqual(['1:5']);
    expect(result.current).toMatchObject({ localOnly: true, failed: false, loading: false });
  });

  it('does not ask the server while the device is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    api.local.mockResolvedValue([hit('1', '5')]);
    const { result } = mount({ query: 'trip', filters: NO_FILTERS });
    await settle();
    await act(async () => { await Promise.resolve(); });
    expect(api.remote).not.toHaveBeenCalled();
    expect(ids(result.current.hits)).toEqual(['1:5']);
    expect(result.current).toMatchObject({ localOnly: true, loading: false });
  });

  it('loads the next server page with the cursor and appends it', async () => {
    api.remote.mockResolvedValueOnce(page([hit('1', '50')], 'c1')).mockResolvedValueOnce(page([hit('1', '40')], null));
    const { result } = mount({ query: 'trip', filters: NO_FILTERS });
    await settle();
    await act(async () => { result.current.loadMore(); });
    expect(api.remote.mock.calls[1][0]).toMatchObject({ q: 'trip', after: 'c1' });
    expect(ids(result.current.hits)).toEqual(['1:50', '1:40']);
    expect(result.current.hasMore).toBe(false);
  });
});
