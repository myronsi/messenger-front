import { afterEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('./client', () => ({ apiClient: { GET: (...args: unknown[]) => get(...args) } }));

const { listChats } = await import('./users');

type Query = { folder: string; after?: string };
const page = (items: { id: string; is_request?: boolean }[], next: string | null = null) =>
  ({ data: { items, next_cursor: next }, response: { ok: true, status: 200 } });

afterEach(() => get.mockReset());

describe('listChats', () => {
  it('loads the main list and the Requests folder in one paged list', async () => {
    get.mockImplementation((_path: string, { params: { query } }: { params: { query: Query } }) =>
      query.after ? page([{ id: '9', is_request: true }]) : page([{ id: '1' }], 'next'));
    const chats = await listChats();
    expect(chats.map((chat) => chat.id)).toEqual(['1', '9']);
    expect(chats.find((chat) => chat.id === '9')?.is_request).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls.every(([path, options]) => path === '/chats' && (options as { params: { query: Query } }).params.query.folder === 'all')).toBe(true);
  });
});
