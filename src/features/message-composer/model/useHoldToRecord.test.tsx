import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LOCK_DISTANCE, useHoldToRecord } from './useHoldToRecord';

const pointer = (clientY: number) => ({
  pointerId: 1, button: 0, clientY, preventDefault: vi.fn(), currentTarget: { setPointerCapture: vi.fn() },
}) as unknown as React.PointerEvent<HTMLElement>;

const setup = () => {
  const start = vi.fn();
  const stop = vi.fn();
  const view = renderHook(({ isRecording, isStarting }) => useHoldToRecord({ enabled: !isRecording && !isStarting, isRecording, isStarting, start, stop }), {
    initialProps: { isRecording: false, isStarting: false },
  });
  return { ...view, start, stop };
};

describe('useHoldToRecord', () => {
  it('records while held and sends on release', () => {
    const { result, start, stop } = setup();
    act(() => result.current.handlers.onPointerDown(pointer(500)));
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.holding).toBe(true);
    act(() => result.current.handlers.onPointerMove(pointer(480)));
    expect(result.current.lift).toBe(20);
    act(() => result.current.handlers.onPointerUp(pointer(480)));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.holding).toBe(false);
    expect(result.current.takeClick()).toBe(false);
    expect(result.current.takeClick()).toBe(true);
  });

  it('locks after sliding up so releasing keeps recording', () => {
    const { result, stop, rerender } = setup();
    act(() => result.current.handlers.onPointerDown(pointer(500)));
    rerender({ isRecording: true, isStarting: false });
    act(() => result.current.handlers.onPointerMove(pointer(500 - LOCK_DISTANCE)));
    expect(result.current.locked).toBe(true);
    act(() => result.current.handlers.onPointerUp(pointer(500 - LOCK_DISTANCE)));
    expect(stop).not.toHaveBeenCalled();
    rerender({ isRecording: false, isStarting: false });
    expect(result.current.locked).toBe(false);
  });

  it('stays locked when the swipe up happens before the microphone has started', () => {
    const { result, stop, rerender } = setup();
    act(() => result.current.handlers.onPointerDown(pointer(500)));
    rerender({ isRecording: false, isStarting: true });
    act(() => result.current.handlers.onPointerMove(pointer(500 - LOCK_DISTANCE)));
    act(() => result.current.handlers.onPointerUp(pointer(500 - LOCK_DISTANCE)));
    rerender({ isRecording: true, isStarting: false });
    expect(result.current.locked).toBe(true);
    expect(stop).not.toHaveBeenCalled();
  });
});
