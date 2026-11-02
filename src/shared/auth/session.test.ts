import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, refreshAccessToken, setAccessToken } from './session';

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
