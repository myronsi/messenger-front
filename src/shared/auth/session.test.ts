import { afterEach, describe, expect, it, vi } from 'vitest';
import { authFetch, getAccessToken, refreshAccessToken, setAccessToken } from './session';

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
    localStorage.removeItem('access_token');
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
    localStorage.removeItem('access_token');
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
    localStorage.setItem('access_token', other);
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
    localStorage.setItem('access_token', fresh);
    release();
    expect(await refreshing).toBe(fresh);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh is rejected because another tab already rotated the token', async () => {
    setAccessToken('old');
    const fresh = jwt(3600);
    vi.stubGlobal('fetch', vi.fn(async () => {
      localStorage.setItem('access_token', fresh);
      return new Response('{}', { status: 401 });
    }));
    expect(await refreshAccessToken()).toBe(fresh);
    expect(getAccessToken()).toBe(fresh);
  });

  it('still ends the session on a rejected refresh when the newer token is already expired', async () => {
    setAccessToken('old');
    vi.stubGlobal('fetch', vi.fn(async () => {
      localStorage.setItem('access_token', jwt(-60));
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
});
