import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQrLogin, pollQrLogin } from '../api/qrLoginApi';
import { useQrLoginPoll } from './useQrLoginPoll';

vi.mock('../api/qrLoginApi', () => ({
  createQrLogin: vi.fn(),
  pollQrLogin: vi.fn(),
  isRateLimited: (error: unknown) => (error as { status?: number })?.status === 429,
}));

const create = vi.mocked(createQrLogin);
const poll = vi.mocked(pollQrLogin);
let visibility: DocumentVisibilityState = 'visible';

const request = (id: string, seconds = 120) => ({
  request_id: id, poll_token: `token-${id}`, url: `https://app.test/qr/${id}`, expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
});
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const setVisibility = (next: DocumentVisibilityState) => act(() => {
  visibility = next;
  document.dispatchEvent(new Event('visibilitychange'));
});

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  create.mockReset();
  poll.mockReset();
});

afterEach(() => { vi.useRealTimers(); });

describe('useQrLoginPoll', () => {
  it('moves from pending to scanned to approved and stops polling after approval', async () => {
    create.mockImplementationOnce(async () => request('a'));
    poll.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'scanned' })
      .mockResolvedValueOnce({ status: 'approved', access_token: 'token', token_type: 'Bearer', expires_in: 900 });
    const onApproved = vi.fn();
    const { result } = renderHook(() => useQrLoginPoll(onApproved));
    await advance(0);
    expect(result.current.status).toBe('pending');
    expect(result.current.request?.url).toBe('https://app.test/qr/a');
    await advance(2000);
    expect(poll).toHaveBeenLastCalledWith('a', 'token-a', expect.any(AbortSignal));
    expect(result.current.status).toBe('pending');
    await advance(2000);
    expect(result.current.status).toBe('scanned');
    await advance(2000);
    expect(result.current.status).toBe('approved');
    expect(onApproved).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'token' }));
    await advance(10_000);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it('stops polling when unmounted', async () => {
    create.mockImplementationOnce(async () => request('a'));
    poll.mockResolvedValue({ status: 'pending' });
    const { unmount } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    await advance(2000);
    expect(poll).toHaveBeenCalledTimes(1);
    unmount();
    await advance(10_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('pauses while the tab is hidden and polls again as soon as it is visible', async () => {
    create.mockImplementationOnce(async () => request('a'));
    poll.mockResolvedValue({ status: 'pending' });
    renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    setVisibility('hidden');
    await advance(10_000);
    expect(poll).not.toHaveBeenCalled();
    setVisibility('visible');
    await advance(0);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('creates a fresh code once when the code expires while visible, then waits for the user', async () => {
    create.mockImplementationOnce(async () => request('a', 5)).mockImplementationOnce(async () => request('b', 5)).mockImplementationOnce(async () => request('c'));
    poll.mockResolvedValue({ status: 'pending' });
    const { result } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    await advance(5000);
    await advance(0);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.current.request?.request_id).toBe('b');
    expect(result.current.status).toBe('pending');
    await advance(5000);
    await advance(0);
    expect(result.current.status).toBe('expired');
    expect(create).toHaveBeenCalledTimes(2);
    act(() => result.current.refresh());
    await advance(0);
    expect(result.current.request?.request_id).toBe('c');
    expect(result.current.status).toBe('pending');
  });

  it('does not refresh by itself after a denial, but does after the server reports expiry', async () => {
    create.mockImplementationOnce(async () => request('a')).mockImplementationOnce(async () => request('b')).mockImplementationOnce(async () => request('c'));
    poll.mockResolvedValueOnce({ status: 'denied' }).mockResolvedValueOnce({ status: 'expired' });
    const { result } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    await advance(2000);
    expect(result.current.status).toBe('denied');
    await advance(10_000);
    expect(create).toHaveBeenCalledTimes(1);
    act(() => result.current.refresh());
    await advance(0);
    await advance(2000);
    await advance(0);
    expect(create).toHaveBeenCalledTimes(3);
    expect(result.current.request?.request_id).toBe('c');
  });

  it('keeps polling after a connection problem and reports it', async () => {
    create.mockImplementationOnce(async () => request('a'));
    poll.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ status: 'scanned' });
    const { result } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    await advance(2000);
    expect(result.current.connectionError).toBe(true);
    await advance(2000);
    expect(result.current.connectionError).toBe(false);
    expect(result.current.status).toBe('scanned');
  });

  it('backs off after a rate limit while the countdown keeps running', async () => {
    create.mockImplementationOnce(async () => request('a'));
    poll.mockRejectedValueOnce({ status: 429 }).mockResolvedValue({ status: 'pending' });
    const { result } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    await advance(2000);
    expect(poll).toHaveBeenCalledTimes(1);
    const before = result.current.seconds;
    await advance(2000);
    expect(poll).toHaveBeenCalledTimes(1);
    expect(result.current.seconds).toBe(before - 2);
    expect(result.current.status).toBe('pending');
    await advance(2000);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(result.current.connectionError).toBe(false);
  });

  it('stops with a message when too many codes were created', async () => {
    create.mockRejectedValueOnce({ status: 429 });
    const { result } = renderHook(() => useQrLoginPoll(vi.fn()));
    await advance(0);
    expect(result.current.status).toBe('rateLimited');
    await advance(30_000);
    expect(create).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();
  });
});
