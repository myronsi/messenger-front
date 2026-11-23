import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveOfflineKeys } from './cipher';
import { memoryBackend } from './memoryBackend';
import { createOfflineDb, type OfflineDb } from './offlineDb';

const state = vi.hoisted(() => ({ db: null as OfflineDb | null, pages: [] as unknown[], calls: [] as unknown[] }));

vi.mock('@/shared/api/client', () => ({
  apiClient: {
    GET: vi.fn(async (_path: string, init: { params?: { query?: { cursor?: string } } }) => {
      state.calls.push(init.params?.query?.cursor ?? null);
      const data = state.pages.shift() ?? { changes: [], next_cursor: '99', has_more: false, reset_required: false };
      return { data, response: new Response(null, { status: 200 }) };
    }),
  },
}));
vi.mock('./offlineSession', () => ({ getOfflineDb: async () => state.db, setOfflineCursorInit: () => undefined }));

const { onOfflineChanges, syncOfflineChanges } = await import('./offlineSync');

const wire = (id: string, content: string) => ({
  id, chat_id: '1', sender_id: '5', sender: { id: '5', username: 'alice', display_name: 'Alice' }, type: 'text', content,
  created_at: '2026-11-23T10:00:00Z', reactions: [],
});

beforeEach(async () => {
  state.db = createOfflineDb(memoryBackend(), await deriveOfflineKeys('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'));
  state.pages = [];
  state.calls = [];
});

describe('offline sync', () => {
  it('starts at the current position when nothing is stored yet', async () => {
    await syncOfflineChanges();
    expect(state.calls).toEqual([null]);
    expect(await state.db!.getCursor()).toBe('99');
  });

  it('applies every page of changes and tells the open screens', async () => {
    const db = state.db!;
    await db.setCursor('10');
    await db.storeMessages('1', [{ id: '100', content: 'old' }, { id: '101', content: 'gone' }, { id: '102', content: 'kept' }]);
    state.pages = [
      { changes: [{ type: 'message_updated', chat_id: '1', message: wire('100', 'new') }, { type: 'message_updated', chat_id: '1', message: wire('200', 'never stored') }],
        next_cursor: '12', has_more: true, reset_required: false },
      { changes: [{ type: 'message_deleted', chat_id: '1', message_id: '101', scope: 'everyone' }, { type: 'pins_changed', chat_id: '1' }],
        next_cursor: '15', has_more: false, reset_required: false },
    ];
    const seen = vi.fn();
    const stop = onOfflineChanges(seen);
    await syncOfflineChanges();
    stop();
    expect(state.calls).toEqual(['10', '12']);
    expect((await db.readLatest<{ id: string; content: string }>('1', 10)).map((m) => [m.id, m.content])).toEqual([['100', 'new'], ['102', 'kept']]);
    expect(await db.getCursor()).toBe('15');
    expect(seen.mock.calls[0][0].map((change: { type: string }) => change.type)).toEqual(['updated', 'updated', 'deleted', 'pins']);
  });

  it('drops a cleared history and starts over after a reset', async () => {
    const db = state.db!;
    await db.setCursor('10');
    await db.storeMessages('1', [{ id: '100', content: 'a' }, { id: '300', content: 'b' }]);
    await db.storeMessages('2', [{ id: '400', content: 'c' }]);
    state.pages = [{ changes: [{ type: 'history_cleared', chat_id: '1', before_message_id: '100', scope: 'me' }], next_cursor: '11', has_more: false, reset_required: false }];
    await syncOfflineChanges();
    expect((await db.readLatest<{ id: string }>('1', 10)).map((m) => m.id)).toEqual(['300']);

    state.pages = [{ changes: [], next_cursor: '500', has_more: false, reset_required: true }];
    await syncOfflineChanges();
    expect(await db.readLatest('1', 10)).toEqual([]);
    expect(await db.readLatest('2', 10)).toEqual([]);
    expect(await db.getCursor()).toBe('500');
  });
});
