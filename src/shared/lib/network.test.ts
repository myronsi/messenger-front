import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isOffline, useOffline } from './network';

afterEach(() => vi.restoreAllMocks());

describe('network', () => {
  it('follows the online and offline events of the browser', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);
    online.mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(true);
    expect(isOffline()).toBe(true);
  });
});
