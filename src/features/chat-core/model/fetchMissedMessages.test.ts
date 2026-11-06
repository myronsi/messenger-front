import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMissedMessages } from './fetchMissedMessages';

const page = { history: [], has_more: false, has_more_after: false, next_before_id: null };
const readPage = vi.fn();

describe('fetchMissedMessages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    readPage.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('asks for the messages after the newest loaded one', async () => {
    readPage.mockResolvedValueOnce(page);
    await expect(fetchMissedMessages(7, 120, 50, () => true, readPage)).resolves.toEqual(page);
    expect(readPage).toHaveBeenCalledWith({ chatId: 7, afterId: 120, limit: 50 });
  });

  it('retries failed requests before giving up', async () => {
    readPage.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page);
    const result = fetchMissedMessages(7, 120, 50, () => true, readPage);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual(page);
    expect(readPage).toHaveBeenCalledTimes(3);
  });

  it('returns null after the last failed attempt or when the chat was left', async () => {
    readPage.mockRejectedValue(new Error('offline'));
    const result = fetchMissedMessages(7, 120, 50, () => true, readPage);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeNull();
    await expect(fetchMissedMessages(7, 120, 50, () => false, readPage)).resolves.toBeNull();
  });
});
