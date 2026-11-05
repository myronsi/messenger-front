import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SWIPE_THRESHOLD, combineTouchHandlers, useSwipeAction } from './useSwipeAction';

const touch = (x: number, y = 100) => ({ touches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent;
const none = {} as TouchEvent;

const drag = (handlers: ReturnType<typeof useSwipeAction>['handlers'], to: number, y = 100) => {
  act(() => handlers.onTouchStart(touch(100)));
  act(() => handlers.onTouchMove(touch(100 + to / 2, y)));
  act(() => handlers.onTouchMove(touch(100 + to, y)));
};

describe('useSwipeAction', () => {
  it.each([1, -1] as const)('requires a firmer drag with resistance in direction %s', direction => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeAction(direction, onSwipe));
    drag(result.current.handlers, direction * 56);
    expect(Math.abs(result.current.offset)).toBeCloseTo(33.6);
    expect(result.current.progress).toBeLessThan(1);
    act(() => result.current.handlers.onTouchEnd(none));
    expect(onSwipe).not.toHaveBeenCalled();
    drag(result.current.handlers, direction * 96);
    expect(Math.abs(result.current.offset)).toBeCloseTo(57.6);
    expect(result.current.progress).toBe(1);
    act(() => result.current.handlers.onTouchEnd(none));
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it('replies after a long enough swipe in its direction and springs back', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeAction(1, onSwipe));
    drag(result.current.handlers, SWIPE_THRESHOLD + 10);
    expect(result.current.offset).toBeGreaterThan(0);
    expect(result.current.progress).toBe(1);
    act(() => result.current.handlers.onTouchEnd(none));
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(result.current.offset).toBe(0);
  });

  it('does nothing for a short swipe, the other direction or a vertical scroll', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeAction(-1, onSwipe));
    drag(result.current.handlers, -20);
    act(() => result.current.handlers.onTouchEnd(none));
    drag(result.current.handlers, SWIPE_THRESHOLD + 20);
    expect(result.current.offset).toBe(0);
    act(() => result.current.handlers.onTouchEnd(none));
    act(() => result.current.handlers.onTouchStart(touch(100)));
    act(() => result.current.handlers.onTouchMove(touch(95, 140)));
    act(() => result.current.handlers.onTouchMove(touch(30, 300)));
    act(() => result.current.handlers.onTouchEnd(none));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('stays still without a handler', () => {
    const { result } = renderHook(() => useSwipeAction(1, undefined));
    drag(result.current.handlers, 100);
    expect(result.current.offset).toBe(0);
  });

  it('runs every combined handler', () => {
    const a = vi.fn();
    const b = vi.fn();
    combineTouchHandlers({ onTouchStart: a }, { onTouchStart: b }).onTouchStart(none);
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});

describe('useSwipeAction cancel', () => {
  it('springs back without replying when the browser cancels the touch', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeAction(1, onSwipe));
    drag(result.current.handlers, SWIPE_THRESHOLD + 10);
    act(() => result.current.handlers.onTouchCancel(none));
    expect(onSwipe).not.toHaveBeenCalled();
    expect(result.current.offset).toBe(0);
  });
});
