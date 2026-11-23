import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.hoisted(() => vi.fn());
const offline = vi.hoisted(() => {
  const media = new Map<string, { blob: Blob; expiresAt: number }>();
  const db = {
    loadMedia: vi.fn(async (url: string) => {
      const record = media.get(url);
      return record ? { blob: record.blob, fresh: record.expiresAt > Date.now() } : undefined;
    }),
    saveMedia: vi.fn(async (url: string, blob: Blob, lifetime: number) => { media.set(url, { blob, expiresAt: Date.now() + lifetime }); }),
  };
  return { media, db };
});

vi.mock('@/shared/auth/session', () => ({ authFetch, getAccessToken: () => null, subscribeToAccessToken: () => () => undefined }));
vi.mock('@/shared/offline', () => ({ getOfflineDb: async () => offline.db, enforceStorageCapSoon: vi.fn() }));

import { keepOfflineCopy } from './mediaCache';

const attachment = (id: string) => `${window.location.origin}/api/v2/attachments/${id}/content`;
const avatar = `${window.location.origin}/api/v2/users/7/avatar`;
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  offline.media.clear();
  vi.clearAllMocks();
  authFetch.mockImplementation(async () => new Response('video', { status: 200, headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'private, max-age=3600' } }));
});

describe('keepOfflineCopy', () => {
  it('keeps an offline copy in the background only when none is stored yet', async () => {
    keepOfflineCopy(attachment('b1'));
    await flush();
    expect(authFetch).toHaveBeenCalledWith(attachment('b1'), { priority: 'low' });
    expect(offline.media.has(attachment('b1'))).toBe(true);

    keepOfflineCopy(attachment('b1'));
    keepOfflineCopy(avatar);
    keepOfflineCopy(undefined);
    await flush();

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(offline.db.saveMedia).toHaveBeenCalledTimes(1);
  });
});
