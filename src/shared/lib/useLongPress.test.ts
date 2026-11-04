import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './useLongPress';

const touch = (x = 10, y = 10) => ({ touches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useLongPress', () => {
  it('fires after holding still and swallows the click that follows', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { vi.advanceTimersByTime(450); });
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.consumeClick()).toBe(true);
    expect(result.current.consumeClick()).toBe(false);
  });

  it('does not fire for a short tap or when the finger moves', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { vi.advanceTimersByTime(200); result.current.handlers.onTouchEnd(); vi.advanceTimersByTime(500); });
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { result.current.handlers.onTouchMove(touch(40, 10)); vi.advanceTimersByTime(500); });
    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.consumeClick()).toBe(false);
  });

  it('lets the first tap after a long press through when that click was never delivered', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { vi.advanceTimersByTime(450); result.current.handlers.onTouchEnd(); });
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { vi.advanceTimersByTime(100); result.current.handlers.onTouchEnd(); });
    expect(result.current.consumeClick()).toBe(false);
  });

  it('does nothing without a handler', () => {
    const { result } = renderHook(() => useLongPress(undefined));
    act(() => result.current.handlers.onTouchStart(touch()));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.consumeClick()).toBe(false);
  });
});
