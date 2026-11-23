import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  authFetch: vi.fn(),
  listeners: [] as Array<(token: string | null) => void>,
}));

const offline = vi.hoisted(() => {
  const media = new Map<string, { blob: Blob; expiresAt: number }>();
  const db = {
    loadMedia: vi.fn(async (url: string) => {
      const record = media.get(url);
      return record ? { blob: record.blob, fresh: record.expiresAt > Date.now() } : undefined;
    }),
    saveMedia: vi.fn(async (url: string, blob: Blob, lifetime: number) => { media.set(url, { blob, expiresAt: Date.now() + lifetime }); }),
  };
  return { media, db, enforceStorageCapSoon: vi.fn() };
});

vi.mock('@/shared/auth/session', () => ({
  authFetch: session.authFetch,
  getAccessToken: () => null,
  subscribeToAccessToken: (listener: (token: string | null) => void) => { session.listeners.push(listener); return () => undefined; },
}));

vi.mock('@/shared/offline', () => ({
  getOfflineDb: async () => offline.db,
  enforceStorageCapSoon: offline.enforceStorageCapSoon,
}));

import { acquireMedia, clearMediaCache, dropMedia, peekMedia, preloadMedia, storageLifetime } from './mediaCache';

const attachment = (id: string) => `${window.location.origin}/api/v2/attachments/${id}/content?variant=thumbnail`;
const avatar = `${window.location.origin}/api/v2/users/7/avatar`;
const cacheStorage = { keys: vi.fn(async () => ['media-v1:1', 'media-v1', 'drafts']), delete: vi.fn(async () => true) };
const storeCopy = (url: string, expiresAt: number) => offline.media.set(url, { blob: new Blob(['old'], { type: 'image/jpeg' }), expiresAt });
const jwt = (sub: string) => `x.${btoa(JSON.stringify({ sub }))}.y`;
const signIn = (sub: string) => session.listeners.forEach(listener => listener(jwt(sub)));
let objectUrls = 0;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  vi.stubEnv('VITE_BASE_URL', window.location.origin + '/api');
  signIn('1');
  objectUrls = 0;
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:media-${++objectUrls}`), revokeObjectURL: vi.fn() });
  vi.stubGlobal('caches', cacheStorage);
  session.authFetch.mockImplementation(async () => new Response('image', { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } }));
});

afterEach(() => {
  clearMediaCache();
  offline.media.clear();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('mediaCache', () => {
  it('shares one request between components that show the same image', async () => {
    const first = acquireMedia(avatar);
    const second = acquireMedia(avatar);

    expect(await first.promise).toBe(await second.promise);
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('reloads an image for one user without breaking the copy other users still show', async () => {
    const other = acquireMedia(avatar);
    const failing = acquireMedia(avatar);
    const shared = await other.promise;
    await failing.promise;

    dropMedia(avatar);
    const fresh = acquireMedia(avatar);
    expect(await fresh.promise).not.toBe(shared);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    failing.release();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    other.release();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(shared);
    expect(peekMedia(avatar)).not.toBe(shared);
  });

  it('keeps a loaded image after its last user is gone', async () => {
    const lease = acquireMedia(avatar);
    const url = await lease.promise;
    lease.release();

    expect(peekMedia(avatar)).toBe(url);
    expect(await acquireMedia(avatar).promise).toBe(url);
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('stores attachments in the offline database and reads them back without the network', async () => {
    await acquireMedia(attachment('a1')).promise;
    await flush();
    expect(offline.db.saveMedia).toHaveBeenCalledWith(attachment('a1'), expect.objectContaining({ size: 5, type: 'image/jpeg' }), 3_600_000);
    expect(offline.enforceStorageCapSoon).toHaveBeenCalled();

    clearMediaCache();
    session.authFetch.mockClear();

    await acquireMedia(attachment('a1')).promise;
    expect(offline.db.loadMedia).toHaveBeenLastCalledWith(attachment('a1'));
    expect(session.authFetch).not.toHaveBeenCalled();
  });

  it('never stores avatars, whose address stays the same when they change', async () => {
    await acquireMedia(avatar).promise;
    await flush();

    expect(offline.db.loadMedia).not.toHaveBeenCalled();
    expect(offline.db.saveMedia).not.toHaveBeenCalled();
  });

  it('stores avatars whose address names their revision', async () => {
    await acquireMedia(`${avatar}?rev=a1`).promise;
    await flush();

    expect(offline.media.has(`${avatar}?rev=a1`)).toBe(true);
  });

  it('cancels a request nobody waits for any more, but not a preload', async () => {
    const signals: AbortSignal[] = [];
    session.authFetch.mockImplementation((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise(() => undefined);
    });

    acquireMedia(avatar).release();
    preloadMedia(attachment('a2'));
    await flush();

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('runs one preload at a time, newest first, and never holds back images on screen', async () => {
    const pending = new Map<string, () => void>();
    session.authFetch.mockImplementation((url: string) => new Promise(resolve => {
      pending.set(url, () => resolve(new Response('image', { status: 200 })));
    }));
    const user = (id: number) => `${window.location.origin}/api/v2/users/${id}/avatar`;

    preloadMedia(user(1));
    preloadMedia(user(2));
    preloadMedia(user(3));
    const onScreen = acquireMedia(user(4));
    await flush();
    expect([...pending.keys()]).toEqual([user(1), user(4)]);
    expect(session.authFetch.mock.calls[0][1].priority).toBe('low');
    expect(session.authFetch.mock.calls[1][1].priority).toBe('auto');

    pending.get(user(1))?.();
    await flush();
    expect([...pending.keys()]).toEqual([user(1), user(4), user(3)]);
    onScreen.release();
  });

  it('starts a waiting preload at once when an image on screen needs it', async () => {
    session.authFetch.mockImplementation(() => new Promise(() => undefined));
    const user = (id: number) => `${window.location.origin}/api/v2/users/${id}/avatar`;

    preloadMedia(user(1));
    preloadMedia(user(2));
    acquireMedia(user(2));
    await flush();

    expect(session.authFetch.mock.calls.map(call => call[0])).toEqual([user(1), user(2)]);
  });

  it('drops a cancelled preload that has not started yet', async () => {
    const pending: Array<() => void> = [];
    session.authFetch.mockImplementation(() => new Promise(resolve => {
      pending.push(() => resolve(new Response('image', { status: 200 })));
    }));
    const user = (id: number) => `${window.location.origin}/api/v2/users/${id}/avatar`;

    preloadMedia(user(1));
    preloadMedia(user(2))();
    await flush();
    pending[0]();
    await flush();

    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed request', async () => {
    session.authFetch.mockResolvedValueOnce(new Response('', { status: 500 }));

    await expect(acquireMedia(avatar).promise).rejects.toThrow('500');
    await acquireMedia(avatar).promise;

    expect(session.authFetch).toHaveBeenCalledTimes(2);
  });

  it('forgets every image when the user signs out', async () => {
    const url = await acquireMedia(attachment('a3')).promise;
    await flush();

    session.listeners.forEach(listener => listener(null));

    expect(peekMedia(attachment('a3'))).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('forgets every image on a direct account switch and deletes the old Cache Storage stores', async () => {
    const url = await acquireMedia(avatar).promise;

    signIn('1');
    expect(peekMedia(avatar)).toBe(url);

    signIn('2');
    expect(peekMedia(avatar)).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);

    session.authFetch.mockClear();
    await acquireMedia(avatar).promise;
    expect(session.authFetch).toHaveBeenCalledTimes(1);

    clearMediaCache();
    await flush();
    expect(cacheStorage.delete).toHaveBeenCalledWith('media-v1:1');
    expect(cacheStorage.delete).toHaveBeenCalledWith('media-v1');
    expect(cacheStorage.delete).not.toHaveBeenCalledWith('drafts');
  });

  it('drops a cancelled preload while it is still looking in the offline database', async () => {
    let finishLookup = () => undefined as void;
    offline.db.loadMedia.mockImplementationOnce(() => new Promise(resolve => { finishLookup = () => resolve(undefined); }));

    const cancel = preloadMedia(attachment('a5'));
    await flush();
    cancel();
    finishLookup();
    await flush();

    expect(session.authFetch).not.toHaveBeenCalled();
  });

  it('keeps a stored copy only as long as the server allows caching it', () => {
    expect(storageLifetime('private, max-age=3600')).toBe(3_600_000);
    expect(storageLifetime('private, max-age=31536000, immutable')).toBe(31_536_000_000);
    expect(storageLifetime('no-store')).toBe(0);
    expect(storageLifetime('private, no-cache, max-age=60')).toBe(0);
    expect(storageLifetime(null)).toBe(0);
  });

  it('does not store a response the server marks no-store', async () => {
    session.authFetch.mockResolvedValueOnce(new Response('image', { status: 200, headers: { 'Cache-Control': 'no-store' } }));

    await acquireMedia(`${avatar}?rev=a9`).promise;
    await flush();

    expect(offline.db.saveMedia).not.toHaveBeenCalled();
  });

  it('downloads again once a stored copy has expired', async () => {
    storeCopy(attachment('a6'), Date.now() - 1);

    await acquireMedia(attachment('a6')).promise;

    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('shows an expired stored copy when the download fails', async () => {
    storeCopy(attachment('a7'), Date.now() - 1);
    session.authFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(acquireMedia(attachment('a7')).promise).resolves.toMatch(/^blob:/);
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('uses an expired stored copy without the network while offline', async () => {
    storeCopy(attachment('a8'), Date.now() - 1);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await expect(acquireMedia(attachment('a8')).promise).resolves.toMatch(/^blob:/);
    expect(session.authFetch).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('ignores media outside the API', () => {
    preloadMedia('/static/avatars/default.jpg');

    expect(session.authFetch).not.toHaveBeenCalled();
  });
});
