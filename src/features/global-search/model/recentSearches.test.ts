import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflineBackend } from '@/shared/offline/backend';
import { deriveOfflineKeys } from '@/shared/offline/cipher';
import { memoryBackend } from '@/shared/offline/memoryBackend';
import { createOfflineDb, type OfflineDb } from '@/shared/offline/offlineDb';

const state = vi.hoisted(() => ({ db: null as OfflineDb | null, backend: null as OfflineBackend | null }));
vi.mock('@/shared/offline', () => ({ getOfflineDb: async () => state.db }));
vi.mock('@/shared/api/indexedStore', () => ({ sessionScope: () => 'session-a' }));

const { MAX_RECENT_SEARCHES, clearRecentSearches, loadRecentSearches, rememberSearch } = await import('./recentSearches');

beforeEach(async () => {
  state.backend = memoryBackend();
  state.db = createOfflineDb(state.backend, await deriveOfflineKeys('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'));
});

describe('recent searches', () => {
  it('keeps the newest ten distinct searches, newest first, and ignores one letter', async () => {
    for (let index = 0; index < 12; index += 1) await rememberSearch(`query ${index}`);
    await rememberSearch('x');
    await rememberSearch('QUERY 5');
    const items = await loadRecentSearches();
    expect(items).toHaveLength(MAX_RECENT_SEARCHES);
    expect(items.slice(0, 3)).toEqual(['QUERY 5', 'query 11', 'query 10']);
    expect(items.filter((item) => item.toLowerCase() === 'query 5')).toHaveLength(1);
  });

  it('stores them sealed in the offline database and clears them', async () => {
    await rememberSearch('secret plan');
    expect(JSON.stringify(await state.backend!.getMeta('sealed'))).not.toContain('secret');
    expect(await loadRecentSearches()).toEqual(['secret plan']);
    await clearRecentSearches();
    expect(await loadRecentSearches()).toEqual([]);
  });

  it('keeps them in memory only when there is no offline database', async () => {
    state.db = null;
    await rememberSearch('memory only');
    expect(await loadRecentSearches()).toEqual(['memory only']);
    await clearRecentSearches();
    expect(await loadRecentSearches()).toEqual([]);
  });
});
