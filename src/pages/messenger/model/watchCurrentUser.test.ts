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
});
