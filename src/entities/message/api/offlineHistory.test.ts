import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveOfflineKeys } from '@/shared/offline/cipher';
import { memoryBackend } from '@/shared/offline/memoryBackend';
import { createOfflineDb, type OfflineDb } from '@/shared/offline/offlineDb';

const state = vi.hoisted(() => ({ db: null as OfflineDb | null }));
vi.mock('@/shared/offline', () => ({
  getOfflineDb: async () => state.db,
  withOfflineDb: (fn: (db: OfflineDb) => Promise<unknown>) => { void fn(state.db!); },
  enforceStorageCapSoon: () => undefined,
}));

const { isUnreachable, localHistoryPage, localSearch } = await import('./offlineHistory');

const ids = (page: { history: { id: string | number }[] } | null) => page?.history.map((message) => String(message.id));

beforeEach(async () => {
  state.db = createOfflineDb(memoryBackend(), await deriveOfflineKeys('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'));
  await state.db.storeMessages('1', Array.from({ length: 10 }, (_, index) => ({ id: String(101 + index), content: `message ${101 + index}` })));
});

describe('offline history pages', () => {
  it('serves the newest page, older pages and newer pages', async () => {
    const latest = await localHistoryPage({ chatId: '1', limit: 4 });
    expect(ids(latest)).toEqual(['107', '108', '109', '110']);
    expect(latest).toMatchObject({ has_more_before: true, has_more_after: false, next_before_id: '107' });
    const older = await localHistoryPage({ chatId: '1', limit: 4, beforeId: '103' });
    expect(ids(older)).toEqual(['101', '102']);
    expect(older).toMatchObject({ has_more_before: false });
    expect(ids(await localHistoryPage({ chatId: '1', limit: 3, afterId: '108' }))).toEqual(['109', '110']);
  });

  it('serves a page around a stored message and nothing around a missing one', async () => {
    expect(ids(await localHistoryPage({ chatId: '1', limit: 4, aroundId: '105' }))).toEqual(['103', '104', '105', '106']);
    expect(ids(await localHistoryPage({ chatId: '1', limit: 4, aroundId: '101' }))).toEqual(['101', '102', '103', '104']);
    expect(await localHistoryPage({ chatId: '1', limit: 4, aroundId: '999' })).toBeNull();
    expect(await localHistoryPage({ chatId: '2' })).toBeNull();
  });

  it('searches the stored messages of one chat', async () => {
    expect((await localSearch('1', 'message 105'))?.results.map((message) => message.id)).toEqual(['105']);
  });
});

describe('unreachable server', () => {
  it('counts network and gateway failures, not answers of the server', () => {
    expect([{ status: 'FETCH_ERROR' }, { status: 502 }, { status: 503 }, { status: 504 }, { status: 'TIMEOUT_ERROR' }].every(isUnreachable)).toBe(true);
    expect([{ status: 401 }, { status: 404 }, { status: 500 }, undefined].some(isUnreachable)).toBe(false);
  });
});
