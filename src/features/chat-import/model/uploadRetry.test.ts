import { describe, expect, it, vi } from 'vitest';
import { UploadError } from '@/shared/api/uploadWithProgress';
import { isTransient, RETRY_DELAYS_SECONDS, withRetry } from './uploadRetry';

const options = (signal?: AbortSignal) => ({ wait: vi.fn(async (_ms: number) => undefined), signal, onWait: vi.fn() });

describe('withRetry', () => {
  it('waits and tries again on rate limits and busy answers', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new UploadError(429, null))
      .mockRejectedValueOnce({ status: 503, body: null })
      .mockResolvedValue('ok');
    const opts = options();
    await expect(withRetry(run, opts)).resolves.toBe('ok');
    expect(opts.wait.mock.calls.map(([ms]) => ms)).toEqual([10_000, 20_000]);
    expect(opts.onWait.mock.calls.map(([seconds]) => seconds)).toEqual([10, 0, 20, 0]);
  });

  it('gives up on other errors at once and after the last delay', async () => {
    const refused = new UploadError(400, null);
    await expect(withRetry(vi.fn().mockRejectedValue(refused), options())).rejects.toBe(refused);
    const busy = new UploadError(503, null);
    const opts = options();
    await expect(withRetry(vi.fn().mockRejectedValue(busy), opts)).rejects.toBe(busy);
    expect(opts.wait).toHaveBeenCalledTimes(RETRY_DELAYS_SECONDS.length);
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
});
