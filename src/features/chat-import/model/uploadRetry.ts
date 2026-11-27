import { errorStatus } from './importErrors';

export const RETRY_DELAYS_SECONDS = [10, 20, 30, 60, 60, 60, 60, 60];
const TRANSIENT_STATUSES = new Set([0, 429, 502, 503, 504]);

export interface RetryOptions {
  wait: (ms: number) => Promise<void>;
  signal?: AbortSignal;
  onWait?: (seconds: number) => void;
}

export const isTransient = (error: unknown) => {
  const status = errorStatus(error);
  if (typeof status === 'number') return TRANSIENT_STATUSES.has(status);
  if (status === 'FETCH_ERROR') return true;
  return error instanceof TypeError || (error instanceof Error && error.message === 'Upload failed');
};

const pause = (options: RetryOptions, ms: number) => new Promise<void>((resolve, reject) => {
  const abort = () => reject(new DOMException('Aborted', 'AbortError'));
  if (options.signal?.aborted) {
    abort();
    return;
  }
  options.signal?.addEventListener('abort', abort, { once: true });
  void options.wait(ms).then(() => {
    options.signal?.removeEventListener('abort', abort);
    resolve();
  });
});

export const retryDelay = async (options: RetryOptions, attempt: number) => {
  const seconds = RETRY_DELAYS_SECONDS[attempt];
  options.onWait?.(seconds);
  try {
    await pause(options, seconds * 1000);
  } finally {
    options.onWait?.(0);
  }
};

export const withRetry = async <T>(run: () => Promise<T>, options: RetryOptions): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (options.signal?.aborted || attempt >= RETRY_DELAYS_SECONDS.length || !isTransient(error)) throw error;
      await retryDelay(options, attempt);
    }
  }
};
