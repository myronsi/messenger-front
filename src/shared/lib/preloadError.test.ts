import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePreloadError, PRELOAD_RELOAD_KEY, PRELOAD_RELOAD_WINDOW_MS } from './preloadError';

describe('handlePreloadError', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('reloads once and suppresses the original error', () => {
    const reload = vi.fn();
    const event = new Event('vite:preloadError', { cancelable: true });

    expect(handlePreloadError(event, 1_000, reload)).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(sessionStorage.getItem(PRELOAD_RELOAD_KEY)).toBe('1000');
  });

  it('does not reload again right after a reload, so a broken deploy cannot loop', () => {
    const reload = vi.fn();
    handlePreloadError(new Event('vite:preloadError', { cancelable: true }), 1_000, reload);
    const second = new Event('vite:preloadError', { cancelable: true });

    expect(handlePreloadError(second, 1_000 + PRELOAD_RELOAD_WINDOW_MS - 1, reload)).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it('reloads again for a later deploy', () => {
    const reload = vi.fn();
    handlePreloadError(new Event('vite:preloadError', { cancelable: true }), 1_000, reload);
    expect(handlePreloadError(new Event('vite:preloadError', { cancelable: true }), 1_000 + PRELOAD_RELOAD_WINDOW_MS, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});