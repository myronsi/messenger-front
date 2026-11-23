import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveOfflineKeys } from '@/shared/offline/cipher';
import { memoryBackend } from '@/shared/offline/memoryBackend';
import { createOfflineDb, type OfflineDb } from '@/shared/offline/offlineDb';
import type { Message } from '../model/types';

const state = vi.hoisted(() => ({ db: null as OfflineDb | null }));
const client = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/shared/offline', () => ({ getOfflineDb: async () => state.db }));
vi.mock('@/shared/api/client', () => ({ apiClient: client }));

const { globalSearchFilter, messageHasKind, searchMessagesLocal, searchMessagesRemote } = await import('./globalSearchApi');

const text = (id: string, content: string, extra: Partial<Message> = {}): Message => ({
  id, content, sender: 'Alice', sender_id: '7', timestamp: `2026-11-${id.padStart(2, '0')}T10:00:00Z`, type: 'message', read_by: [], ...extra,
});
const file = (id: string, kind: string, fileName: string, caption = ''): Message => ({
  ...text(id, ''), type: 'file', sender_id: '8', sender: 'Bob',
  content: { kind, file_name: fileName, file_url: `/media/${id}`, caption } as Message['content'],
});

beforeEach(async () => {
  client.GET.mockReset();
  state.db = createOfflineDb(memoryBackend(), await deriveOfflineKeys('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'));
  await state.db.storeMessages('1', [text('1', 'trip plan'), file('2', 'image', 'beach.jpg', 'trip photo'), file('3', 'file', 'trip.pdf')]);
  await state.db.storeMessages('2', [text('4', 'see https://example.com/trip'), file('5', 'video', 'clip.mp4'), text('6', 'trip done', { is_deleted: true })]);
});

describe('message kinds and filters', () => {
  it('tells photos and videos, files and links apart', () => {
    expect(messageHasKind(file('2', 'image', 'a.jpg'), 'visual')).toBe(true);
    expect(messageHasKind(file('5', 'video', 'a.mp4'), 'visual')).toBe(true);
    expect(messageHasKind(file('3', 'file', 'a.pdf'), 'visual')).toBe(false);
    expect(messageHasKind(file('3', 'file', 'a.pdf'), 'file')).toBe(true);
    expect(messageHasKind(text('4', 'go to www.example.com'), 'link')).toBe(true);
    expect(messageHasKind(text('1', 'no link here'), 'link')).toBe(false);
  });

  it('filters by sender, type and date range and skips deleted messages', () => {
    const messages = [text('1', 'a'), file('3', 'file', 'b.pdf'), text('20', 'c'), text('6', 'd', { is_deleted: true })];
    const ids = (accept: (message: Message) => boolean) => messages.filter(accept).map((message) => message.id);
    expect(ids(globalSearchFilter(undefined, { senderId: '8' }))).toEqual(['3']);
    expect(ids(globalSearchFilter(undefined, { type: 'text' }))).toEqual(['1', '20']);
    expect(ids(globalSearchFilter(undefined, { from: '2026-11-02T00:00:00Z', to: '2026-11-10T00:00:00Z' }))).toEqual(['3']);
  });
});

describe('local global search', () => {
  it('finds words in text, captions and file names across chats, newest first', async () => {
    const hits = await searchMessagesLocal({ q: 'trip', filters: {} });
    expect(hits?.map((hit) => [hit.chatId, String(hit.message.id)])).toEqual([['2', '4'], ['1', '3'], ['1', '2'], ['1', '1']]);
  });

  it('applies kinds and filters, and lists the newest of a kind without words', async () => {
    expect((await searchMessagesLocal({ q: 'trip', kind: 'file', filters: {} }))?.map((hit) => hit.message.id)).toEqual(['3']);
    expect((await searchMessagesLocal({ q: 'trip', filters: { chatId: '2' } }))?.map((hit) => hit.message.id)).toEqual(['4']);
    expect((await searchMessagesLocal({ q: 'trip', filters: { senderId: '7' } }))?.map((hit) => hit.message.id)).toEqual(['4', '1']);
    expect((await searchMessagesLocal({ q: '', kind: 'visual', filters: {} }))?.map((hit) => hit.message.id)).toEqual(['5', '2']);
    expect(await searchMessagesLocal({ q: '', filters: {} })).toEqual([]);
  });

  it('answers null without an offline database', async () => {
    state.db = null;
    expect(await searchMessagesLocal({ q: 'trip', filters: {} })).toBeNull();
  });
});

describe('server global search', () => {
  it('sends words, kind and filters and maps the page', async () => {
    client.GET.mockResolvedValue({
      data: { items: [{ message: { id: '9', chat_id: '3', type: 'text', reactions: [], content: 'hello trip', created_at: '2026-11-09T10:00:00Z', sender: { id: '7' } },
        highlight: 'hello trip' }], next_cursor: 'c2' },
      response: new Response(null, { status: 200 }),
    });
    const result = await searchMessagesRemote({
      q: 'trip', kind: 'link', after: 'c1', limit: 20,
      filters: { chatId: '3', senderId: '7', type: 'text', from: '2026-11-01T00:00:00Z', to: '2026-11-10T00:00:00Z' },
    });
    expect(client.GET).toHaveBeenCalledWith('/search/messages', expect.objectContaining({ params: { query: {
      q: 'trip', kind: 'link', chat_id: '3', sender_id: '7', type: 'text', from: '2026-11-01T00:00:00Z', to: '2026-11-10T00:00:00Z', limit: 20, after: 'c1',
    } } }));
    expect(result.data?.nextCursor).toBe('c2');
    expect(result.data?.items[0]).toMatchObject({ chatId: '3', highlight: 'hello trip', message: { id: '9', sender_id: '7' } });
  });

  it('leaves out the words when only a kind is asked for', async () => {
    client.GET.mockResolvedValue({ data: { items: [], next_cursor: null }, response: new Response(null, { status: 200 }) });
    await searchMessagesRemote({ q: '', kind: 'visual', filters: {} });
    expect(client.GET.mock.calls[0][1].params.query).toEqual({ kind: 'visual', limit: 30 });
  });
});
