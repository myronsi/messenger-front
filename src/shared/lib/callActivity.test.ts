import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCallActive, setCallActive } from './callActivity';
import { handlePreloadError } from './preloadError';

describe('call activity', () => {
  afterEach(() => { setCallActive(false); sessionStorage.clear(); });

  it('does not reload the app for a stale chunk while a call is running', () => {
    const reload = vi.fn();
    setCallActive(true);
    expect(isCallActive()).toBe(true);
    const event = new Event('vite:preloadError', { cancelable: true });
    expect(handlePreloadError(event, 1_000, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    setCallActive(false);
    expect(handlePreloadError(new Event('vite:preloadError', { cancelable: true }), 1_000, reload)).toBe(true);
  });
});
