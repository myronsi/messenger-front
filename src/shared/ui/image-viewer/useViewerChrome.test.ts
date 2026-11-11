import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CHROME_TAP_DELAY_MS, useViewerChrome } from './useViewerChrome';

afterEach(() => vi.useRealTimers());

it('toggles the tools after the double-tap window', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useViewerChrome());
  act(() => result.current.toggleSoon());
  expect(result.current.visible).toBe(true);
  act(() => { vi.advanceTimersByTime(CHROME_TAP_DELAY_MS); });
  expect(result.current.visible).toBe(false);
});

it('leaves the tools alone when a second tap follows, because that tap zooms', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useViewerChrome());
  act(() => result.current.toggleSoon());
  act(() => result.current.cancel());
  act(() => { vi.advanceTimersByTime(CHROME_TAP_DELAY_MS); });
  expect(result.current.visible).toBe(true);
});

it('toggles at once when no double tap is possible', () => {
  const { result } = renderHook(() => useViewerChrome());
  act(() => result.current.toggleNow());
  expect(result.current.visible).toBe(false);
});
