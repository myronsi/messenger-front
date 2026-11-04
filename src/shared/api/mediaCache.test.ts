import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  authFetch: vi.fn(),
  listeners: [] as Array<(token: string | null) => void>,
}));

vi.mock('@/shared/auth/session', () => ({
  authFetch: session.authFetch,
  getAccessToken: () => null,
  subscribeToAccessToken: (listener: (token: string | null) => void) => { session.listeners.push(listener); return () => undefined; },
}));

import { acquireMedia, clearMediaCache, peekMedia, preloadMedia, storageLifetime } from './mediaCache';

const attachment = (id: string) => `${window.location.origin}/api/v2/attachments/${id}/content?variant=thumbnail`;
const avatar = `${window.location.origin}/api/v2/users/7/avatar`;
const stored = new Map<string, Response>();
const store = {
  match: vi.fn(async (url: string) => stored.get(url)?.clone()),
  put: vi.fn(async (url: string, response: Response) => { stored.set(url, response); }),
  keys: vi.fn(async () => [...stored.keys()].map(url => new Request(url))),
  delete: vi.fn(async (request: Request | string) => stored.delete(typeof request === 'string' ? request : request.url)),
};
const cacheStorage = { open: vi.fn(async () => store), keys: vi.fn(async () => ['media-v1:1']), delete: vi.fn(async () => { stored.clear(); return true; }) };
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
  stored.clear();
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

  it('keeps a loaded image after its last user is gone', async () => {
    const lease = acquireMedia(avatar);
    const url = await lease.promise;
    lease.release();

    expect(peekMedia(avatar)).toBe(url);
    expect(await acquireMedia(avatar).promise).toBe(url);
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('stores attachments in Cache Storage and reads them back without the network', async () => {
    await acquireMedia(attachment('a1')).promise;
    await flush();
    expect(stored.has(attachment('a1'))).toBe(true);

    clearMediaCache();
    await flush();
    stored.set(attachment('a1'), new Response('image', { headers: { 'X-Media-Expires': String(Date.now() + 60_000) } }));
    session.authFetch.mockClear();

    await acquireMedia(attachment('a1')).promise;
    expect(session.authFetch).not.toHaveBeenCalled();
  });

  it('never stores avatars, whose address stays the same when they change', async () => {
    await acquireMedia(avatar).promise;
    await flush();

    expect(store.put).not.toHaveBeenCalled();
  });

  it('stores avatars whose address names their revision', async () => {
    await acquireMedia(`${avatar}?rev=a1`).promise;
    await flush();

    expect(stored.has(`${avatar}?rev=a1`)).toBe(true);
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
    await flush();
    expect(cacheStorage.delete).toHaveBeenCalledWith('media-v1:1');
  });

  it('keeps each account in its own store and forgets everything on a direct account switch', async () => {
    const url = await acquireMedia(attachment('a4')).promise;
    await flush();
    expect(cacheStorage.open).toHaveBeenCalledWith('media-v1:1');

    signIn('1');
    expect(peekMedia(attachment('a4'))).toBe(url);

    signIn('2');
    await flush();
    expect(peekMedia(attachment('a4'))).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    expect(cacheStorage.delete).toHaveBeenCalledWith('media-v1:1');

    cacheStorage.open.mockClear();
    session.authFetch.mockClear();
    await acquireMedia(attachment('a4')).promise;
    expect(cacheStorage.open).toHaveBeenCalledWith('media-v1:2');
    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('drops a cancelled preload while it is still looking in Cache Storage', async () => {
    let finishLookup: (response: Response | undefined) => void = () => undefined;
    store.match.mockImplementationOnce(() => new Promise(resolve => { finishLookup = resolve; }));

    const cancel = preloadMedia(attachment('a5'));
    await flush();
    cancel();
    finishLookup(undefined);
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

    expect(store.put).not.toHaveBeenCalled();
  });

  it('downloads again once a stored copy has expired', async () => {
    stored.set(attachment('a6'), new Response('old', { headers: { 'X-Media-Expires': String(Date.now() - 1) } }));

    await acquireMedia(attachment('a6')).promise;

    expect(session.authFetch).toHaveBeenCalledTimes(1);
  });

  it('ignores media outside the API', () => {
    preloadMedia('/static/avatars/default.jpg');

    expect(session.authFetch).not.toHaveBeenCalled();
  });
});
