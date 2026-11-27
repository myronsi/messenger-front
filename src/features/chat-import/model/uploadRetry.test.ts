import { describe, expect, it, vi } from 'vitest';
import { UploadError } from '@/shared/api/uploadWithProgress';
import { isTransient, MAX_RETRIES, retryDelayMs, withRetry } from './uploadRetry';

const options = (signal?: AbortSignal) => ({ wait: vi.fn(async (_ms: number) => undefined), signal, onWait: vi.fn() });

describe('withRetry', () => {
  it('waits and tries again on rate limits and busy answers', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new UploadError(429, null))
      .mockRejectedValueOnce({ status: 503, body: null })
      .mockResolvedValue('ok');
    const opts = options();
    await expect(withRetry(run, opts)).resolves.toBe('ok');
    expect(opts.wait).toHaveBeenCalledTimes(2);
    expect(opts.onWait.mock.calls.map(([seconds]) => (seconds > 0 ? 'waiting' : 0))).toEqual(['waiting', 0, 'waiting', 0]);
  });

  it('gives up on other errors at once and after the last delay', async () => {
    const refused = new UploadError(400, null);
    await expect(withRetry(vi.fn().mockRejectedValue(refused), options())).rejects.toBe(refused);
    const busy = new UploadError(503, null);
    const opts = options();
    await expect(withRetry(vi.fn().mockRejectedValue(busy), opts)).rejects.toBe(busy);
    expect(opts.wait).toHaveBeenCalledTimes(MAX_RETRIES);
  });

  it('stops waiting when the import is stopped', async () => {
    const controller = new AbortController();
    const opts = { ...options(controller.signal), wait: vi.fn(() => new Promise<void>(() => undefined)) };
    const pending = withRetry(vi.fn().mockRejectedValue(new UploadError(429, null)), opts);
    controller.abort();
    await expect(pending).rejects.toThrow();
  });

  it('treats network failures as temporary and code errors as not', () => {
    expect(isTransient(new Error('Upload failed'))).toBe(true);
    expect(isTransient(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransient({ status: 'FETCH_ERROR' })).toBe(true);
    expect(isTransient(new Error('boom'))).toBe(false);
    expect(isTransient({ status: 413 })).toBe(false);
  });

  it('follows Retry-After when the server sends it and backs off with jitter otherwise', () => {
    expect(retryDelayMs(0, new UploadError(429, null, 7), () => 0)).toBe(7000);
    expect(retryDelayMs(0, new UploadError(429, null, 7), () => 0.999)).toBe(7999);
    expect(retryDelayMs(0, new UploadError(429, null, 600), () => 0)).toBe(60_000);
    expect(retryDelayMs(0, new UploadError(503, null), () => 0)).toBe(1000);
    expect(retryDelayMs(0, new UploadError(503, null), () => 1)).toBe(2000);
    expect(retryDelayMs(3, new UploadError(503, null), () => 1)).toBe(16_000);
    expect(retryDelayMs(10, new UploadError(503, null), () => 1)).toBe(60_000);
    expect(retryDelayMs(10, new UploadError(503, null), () => 0)).toBe(30_000);
  });
});
