import { errorStatus } from './importErrors';

export const MAX_RETRIES = 10;
const BASE_DELAY_SECONDS = 2;
const MAX_DELAY_SECONDS = 60;
const TRANSIENT_STATUSES = new Set([0, 429, 502, 503, 504]);

export interface RetryOptions {
  wait: (ms: number) => Promise<void>;
  signal?: AbortSignal;
  onWait?: (seconds: number) => void;
  random?: () => number;
}

export const isTransient = (error: unknown) => {
  const status = errorStatus(error);
  if (typeof status === 'number') return TRANSIENT_STATUSES.has(status);
  if (status === 'FETCH_ERROR') return true;
  return error instanceof TypeError || (error instanceof Error && error.message === 'Upload failed');
};

export const retryAfterOf = (error: unknown) => {
  const value = (error as { retryAfter?: unknown } | null)?.retryAfter;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
};

export const retryDelayMs = (attempt: number, error: unknown, random: () => number = Math.random) => {
  const told = retryAfterOf(error);
  if (told !== null) return Math.round((Math.min(told, MAX_DELAY_SECONDS) + random()) * 1000);
  const ceiling = Math.min(MAX_DELAY_SECONDS, BASE_DELAY_SECONDS * 2 ** attempt);
  return Math.round(ceiling * (0.5 + random() / 2) * 1000);
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

export const retryDelay = async (options: RetryOptions, attempt: number, error: unknown) => {
  const ms = retryDelayMs(attempt, error, options.random);
  options.onWait?.(Math.max(1, Math.round(ms / 1000)));
  try {
    await pause(options, ms);
  } finally {
    options.onWait?.(0);
  }
};

export const withRetry = async <T>(run: () => Promise<T>, options: RetryOptions): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (options.signal?.aborted || attempt >= MAX_RETRIES || !isTransient(error)) throw error;
      await retryDelay(options, attempt, error);
    }
  }
};
