import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken, getAccessToken } from '@/shared/auth/session';
import { watchCurrentUser } from './watchCurrentUser';

const ok = () => new Response(JSON.stringify({ username: 'mai' }), { status: 200 });
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('watchCurrentUser', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps checking a saved session while the server is unreachable and resumes when back online', async () => {
    vi.useFakeTimers();
    setAccessToken('saved');
    const fetchMe = vi.fn().mockRejectedValue(new TypeError('offline'));
    const onUser = vi.fn();
    const onSignedOut = vi.fn();
    watchCurrentUser({ fetchMe, onUser, onSignedOut });
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMe.mock.calls.length).toBeGreaterThan(4);
    expect(onSignedOut).not.toHaveBeenCalled();
    fetchMe.mockResolvedValueOnce(ok());
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(onUser).toHaveBeenCalledWith({ username: 'mai' });
    expect(getAccessToken()).toBe('saved');
  });

  it('signs out when the server rejects the session', async () => {
    vi.useFakeTimers();
    setAccessToken('saved');
    const onSignedOut = vi.fn();
    watchCurrentUser({ fetchMe: async () => new Response('{}', { status: 401 }), onUser: vi.fn(), onSignedOut });
    await flush();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  const jwt = (sub: string) => `header.${btoa(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
  const pendingMe = () => {
    let respond: (response: Response) => void = () => undefined;
    const fetchMe = vi.fn(() => new Promise<Response>((resolve) => { respond = resolve; }));
    return { fetchMe, respond: (response: Response) => respond(response) };
  };

  it('ignores a late user response when another tab signed out meanwhile', async () => {
    vi.useFakeTimers();
    setAccessToken(jwt('1'));
    const { fetchMe, respond } = pendingMe();
    const onUser = vi.fn();
    const onSignedOut = vi.fn();
    watchCurrentUser({ fetchMe, onUser, onSignedOut });
    await flush();
    setAccessToken(null);
    respond(ok());
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onUser).not.toHaveBeenCalled();
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('ignores a late user response after a sign-out and a sign-in as another account', async () => {
    vi.useFakeTimers();
    setAccessToken(jwt('1'));
    const { fetchMe, respond } = pendingMe();
    const onUser = vi.fn();
    watchCurrentUser({ fetchMe, onUser, onSignedOut: vi.fn() });
    await flush();
    setAccessToken(null);
    setAccessToken(jwt('2'));
    respond(ok());
    await flush();
    expect(onUser).not.toHaveBeenCalled();
  });

  it('accepts the user when the token was only refreshed for the same account meanwhile', async () => {
    vi.useFakeTimers();
    setAccessToken(jwt('1'));
    const { fetchMe, respond } = pendingMe();
    const onUser = vi.fn();
    watchCurrentUser({ fetchMe, onUser, onSignedOut: vi.fn() });
    await flush();
    setAccessToken(jwt('1') + 'x');
    respond(ok());
    await flush();
    expect(onUser).toHaveBeenCalledWith({ username: 'mai' });
  });

  it('stops checking after it is stopped', async () => {
    vi.useFakeTimers();
    setAccessToken('saved');
    const fetchMe = vi.fn().mockRejectedValue(new TypeError('offline'));
    const stop = watchCurrentUser({ fetchMe, onUser: vi.fn(), onSignedOut: vi.fn() });
    await flush();
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });
});
