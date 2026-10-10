import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/shared/auth/session';
import { fetchMissedMessages } from './fetchMissedMessages';

vi.mock('@/shared/auth/session', () => ({ authFetch: vi.fn() }));

// A v2 MessagePage, and what the app makes of it.
const page = { items: [], next_cursor: null, prev_cursor: null };
const mapped = { history: [], has_more: false, has_more_before: false, has_more_after: false, next_before_id: null, next_after_id: null };
const ok = () => ({ ok: true, json: async () => page }) as Response;
const failed = () => ({ ok: false, status: 502 }) as Response;

describe('fetchMissedMessages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(authFetch).mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('asks for the messages after the newest loaded one', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(ok());
    await expect(fetchMissedMessages('7', '120', 50, () => true)).resolves.toEqual(mapped);
    expect(vi.mocked(authFetch).mock.calls[0][0]).toMatch(/\/chats\/7\/messages\?limit=50&after=120$/);
  });

  it('retries failed requests before giving up', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(failed()).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ok());
    const result = fetchMissedMessages('7', '120', 50, () => true);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual(mapped);
    expect(authFetch).toHaveBeenCalledTimes(3);
  });

  it('returns null after the last failed attempt or when the chat was left', async () => {
    vi.mocked(authFetch).mockResolvedValue(failed());
    const result = fetchMissedMessages('7', '120', 50, () => true);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeNull();
    await expect(fetchMissedMessages('7', '120', 50, () => false)).resolves.toBeNull();
  });
});
