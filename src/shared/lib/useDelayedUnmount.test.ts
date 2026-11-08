import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDelayedUnmount } from './useDelayedUnmount';

afterEach(() => vi.useRealTimers());

it('keeps a closed panel mounted while it animates out, then unmounts it', () => {
  vi.useFakeTimers();
  const view = renderHook(({ open }) => useDelayedUnmount(open, 200), { initialProps: { open: false } });
  expect(view.result.current).toEqual({ mounted: false, closing: false });
  view.rerender({ open: true });
  expect(view.result.current).toEqual({ mounted: true, closing: false });
  view.rerender({ open: false });
  expect(view.result.current).toEqual({ mounted: true, closing: true });
  act(() => { vi.advanceTimersByTime(199); });
  expect(view.result.current.mounted).toBe(true);
  act(() => { vi.advanceTimersByTime(1); });
  expect(view.result.current).toEqual({ mounted: false, closing: false });
});

it('reopens at once when opened again during the close animation', () => {
  vi.useFakeTimers();
  const view = renderHook(({ open }) => useDelayedUnmount(open, 200), { initialProps: { open: true } });
  view.rerender({ open: false });
  act(() => { vi.advanceTimersByTime(100); });
  view.rerender({ open: true });
  act(() => { vi.advanceTimersByTime(200); });
  expect(view.result.current).toEqual({ mounted: true, closing: false });
});
