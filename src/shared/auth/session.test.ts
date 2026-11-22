import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { forgetCachedDeviceKey, forgetDeviceKey } from './deviceKey';
import { authFetch, endSession, getAccessToken, mayHaveRefreshSession, refreshAccessToken, setAccessToken, subscribeToAccessToken } from './session';

vi.mock('./deviceKey', async (importOriginal) => ({
  ...await importOriginal<typeof import('./deviceKey')>(),
  forgetDeviceKey: vi.fn(async () => undefined),
  forgetCachedDeviceKey: vi.fn(),
}));

const otherTab = new BroadcastChannel('auth');
afterAll(() => otherTab.close());

const fromOtherTab = async (message: { type: 'token'; token: string } | { type: 'logout' }) => {
  otherTab.postMessage(message);
  await vi.waitFor(() => expect(getAccessToken()).toBe(message.type === 'token' ? message.token : null));
};

const received: unknown[] = [];
otherTab.addEventListener('message', (event) => received.push(event.data));

const problem = (status: number, code: string) => new Response(JSON.stringify({ status, code }), {
  status, headers: { 'Content-Type': 'application/problem+json' },
});

const jwt = (expiresInSeconds: number) => {
  const payload = btoa(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `header.${payload}.signature`;
};

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    localStorage.clear();
  });

  it('keeps the session when the refresh cannot reach the server or the server is busy', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));
    expect(await refreshAccessToken()).toBeNull();
    for (const status of [429, 502, 503]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status })));
      expect(await refreshAccessToken()).toBeNull();
    }
    expect(getAccessToken()).toBe('old');
  });

  it('ends the session when the server rejects the refresh', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })));
    expect(await refreshAccessToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('keeps the session when the device proof was rejected only because of the clock', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(problem(401, 'device_proof_stale')));
    expect(await refreshAccessToken()).toBeNull();
    expect(getAccessToken()).toBe('old');
    expect(mayHaveRefreshSession()).toBe(true);
  });

  it('ends the session when the refresh session is bound to another device key', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(problem(401, 'invalid_token')));
    expect(await refreshAccessToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(mayHaveRefreshSession()).toBe(false);
  });

  it('stores the new access token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'new' }), { status: 200 })));
    expect(await refreshAccessToken()).toBe('new');
    expect(getAccessToken()).toBe('new');
  });

  it('skips a queued refresh when another tab signed out while it waited for the lock', async () => {
    setAccessToken('old');
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: {
      request: async (_name: string, task: () => Promise<unknown>) => { await held; return task(); },
    } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const refreshing = refreshAccessToken();
    await fromOtherTab({ type: 'logout' });
    release();
    expect(await refreshing).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('does not restore the token when another tab signs out while the refresh is in flight', async () => {
    setAccessToken('old');
    let respond!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { respond = resolve; })));
    const refreshing = refreshAccessToken();
    await Promise.resolve();
    await fromOtherTab({ type: 'logout' });
    respond(new Response(JSON.stringify({ access_token: 'new' }), { status: 200 }));
    expect(await refreshing).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('keeps the other account when another tab switches accounts while the refresh is in flight', async () => {
    const asUser = (sub: string) => `header.${btoa(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    setAccessToken(asUser('1'));
    let respond!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { respond = resolve; })));
    const refreshing = refreshAccessToken();
    await Promise.resolve();
    const other = asUser('2');
    await fromOtherTab({ type: 'token', token: other });
    respond(new Response('{}', { status: 401 }));
    expect(await refreshing).toBeNull();
    expect(getAccessToken()).toBe(other);
  });

  it('uses the token another tab stored while this tab waited for the refresh lock', async () => {
    setAccessToken('old');
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: {
      request: async (_name: string, task: () => Promise<unknown>) => { await held; return task(); },
    } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const refreshing = refreshAccessToken();
    const fresh = jwt(3600);
    await fromOtherTab({ type: 'token', token: fresh });
    release();
    expect(await refreshing).toBe(fresh);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh is rejected because another tab already rotated the token', async () => {
    setAccessToken('old');
    const fresh = jwt(3600);
    vi.stubGlobal('fetch', vi.fn(async () => {
      await fromOtherTab({ type: 'token', token: fresh });
      return new Response('{}', { status: 401 });
    }));
    expect(await refreshAccessToken()).toBe(fresh);
    expect(getAccessToken()).toBe(fresh);
  });

  it('still ends the session on a rejected refresh when the newer token is already expired', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn(async () => {
      const expired = jwt(-60);
      await fromOtherTab({ type: 'token', token: expired });
      return new Response('{}', { status: 401 });
    }));
    expect(await refreshAccessToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('reports a request as failed, not unauthorized, while the refresh cannot reach the server', async () => {
    setAccessToken('expired');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/refresh')) throw new TypeError('Failed to fetch');
      return new Response('{}', { status: 401 });
    }));
    await expect(authFetch('https://api.test/auth/me')).rejects.toThrow();
    expect(getAccessToken()).toBe('expired');
  });

  it('tries the refresh cookie only once on a signed-out request', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    expect((await authFetch('https://api.test/me')).status).toBe(401);
    expect(fetcher.mock.calls).toHaveLength(2);
  });

  it('keeps the session and skips the refresh when the server asks for a second factor', async () => {
    setAccessToken(jwt(600));
    const problem = new Response(JSON.stringify({ code: 'two_factor_required', status: 401 }), {
      status: 401, headers: { 'Content-Type': 'application/problem+json' },
    });
    const fetcher = vi.fn().mockResolvedValueOnce(problem);
    vi.stubGlobal('fetch', fetcher);
    const response = await authFetch('https://api.test/me/recovery-key', { method: 'POST' });
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('two_factor_required');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).not.toBeNull();
  });
});

describe('refresh session marker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('tries the refresh cookie once for a browser that predates the marker and remembers a rejection', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    expect(mayHaveRefreshSession()).toBe(true);
    expect(await refreshAccessToken()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mayHaveRefreshSession()).toBe(false);
    expect(await refreshAccessToken()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps trying while the first refresh cannot reach the server', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'restored' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await refreshAccessToken()).toBeNull();
    expect(mayHaveRefreshSession()).toBe(true);
    expect(await refreshAccessToken()).toBe('restored');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refreshes a signed-out visitor only after a sign-in left the marker', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ access_token: 'next' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    setAccessToken('signed-in');
    endSession();
    expect(mayHaveRefreshSession()).toBe(false);
    expect(await refreshAccessToken()).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    setAccessToken('signed-in');
    vi.resetModules();
    const reloaded = await import('./session');
    expect(reloaded.getAccessToken()).toBeNull();
    expect(await reloaded.refreshAccessToken()).toBe('next');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('access token in memory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(forgetDeviceKey).mockClear();
    vi.mocked(forgetCachedDeviceKey).mockClear();
    localStorage.clear();
  });

  it('never writes the access token to local storage', () => {
    setAccessToken('in-memory');
    expect(getAccessToken()).toBe('in-memory');
    expect(Object.values({ ...localStorage })).not.toContain('in-memory');
    endSession();
    expect(getAccessToken()).toBeNull();
  });

  it('removes the access token an older version left in local storage', async () => {
    localStorage.setItem('access_token', 'legacy');
    vi.resetModules();
    const reloaded = await import('./session');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(reloaded.getAccessToken()).toBeNull();
  });

  it('tells other tabs about a new token and about a sign-out', async () => {
    setAccessToken('shared');
    await vi.waitFor(() => expect(received[received.length - 1]).toEqual({ type: 'token', token: 'shared' }));
    endSession();
    await vi.waitFor(() => expect(received[received.length - 1]).toEqual({ type: 'logout' }));
  });

  it('follows a token and a sign-out from another tab', async () => {
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeToAccessToken((token) => seen.push(token));
    await fromOtherTab({ type: 'token', token: 'from-other-tab' });
    await fromOtherTab({ type: 'logout' });
    unsubscribe();
    expect(seen).toEqual(['from-other-tab', null]);
    expect(forgetCachedDeviceKey).toHaveBeenCalled();
  });

  it('forgets the device key when the session ends', () => {
    setAccessToken('signed-in');
    endSession();
    expect(forgetDeviceKey).toHaveBeenCalledTimes(1);
  });

  it('keeps the device key when a recovery replaced the session it was just bound to', () => {
    setAccessToken('signed-in');
    endSession({ keepDeviceKey: true });
    expect(getAccessToken()).toBeNull();
    expect(forgetDeviceKey).not.toHaveBeenCalled();
  });
});
