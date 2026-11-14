import { act, renderHook } from '@testing-library/react';
import type { MouseEvent, PointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { moveItem, REORDER_HOLD_MS, REORDER_SETTLE_MS, targetIndex, usePinnedReorder } from './usePinnedReorder';

describe('pinned reorder helpers', () => {
  it('moves one item to a new index', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('finds the slot whose middle the dragged row crossed', () => {
    const middles = [30, 90, 150, 210];
    expect(targetIndex(middles, 0, 40)).toBe(0);
    expect(targetIndex(middles, 0, 100)).toBe(1);
    expect(targetIndex(middles, 0, 220)).toBe(3);
    expect(targetIndex(middles, 3, 80)).toBe(1);
    expect(targetIndex(middles, 3, 10)).toBe(0);
  });
});

describe('usePinnedReorder hold', () => {
  const pointer = { pointerType: 'touch', button: 0, clientX: 10, clientY: 20 } as unknown as PointerEvent<HTMLElement>;
  const contextMenu = () => ({ clientX: 11, clientY: 21, preventDefault: vi.fn() }) as unknown as MouseEvent;

  it('opens the chat menu once from the native long press when the hold timer never fires', () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const { result } = renderHook(() => usePinnedReorder({ pinnedIds: [], onCommit: vi.fn(), onHold, onDragStart: vi.fn() }));
    act(() => result.current.bind('7').onPointerDown(pointer));
    const event = contextMenu();
    act(() => result.current.bind('7').onContextMenu(event));
    act(() => { vi.advanceTimersByTime(REORDER_HOLD_MS); });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onHold).toHaveBeenCalledOnce();
    expect(onHold).toHaveBeenCalledWith('7', 11, 21);
    vi.useRealTimers();
  });

  it('leaves the desktop right click to the row', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() => usePinnedReorder({ pinnedIds: [], onCommit: vi.fn(), onHold, onDragStart: vi.fn() }));
    act(() => result.current.bind('7').onPointerDown({ ...pointer, pointerType: 'mouse' } as PointerEvent<HTMLElement>));
    const event = contextMenu();
    act(() => result.current.bind('7').onContextMenu(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onHold).not.toHaveBeenCalled();
  });

  it('glides the dropped row into its slot before committing the new order', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result } = renderHook(() => usePinnedReorder({ pinnedIds: ['a', 'b'], onCommit, onHold: vi.fn(), onDragStart: vi.fn() }));
    const row = (top: number) => ({ getBoundingClientRect: () => ({ top, height: 50 }) }) as HTMLElement;
    act(() => {
      result.current.bind('a').ref(row(0));
      result.current.bind('b').ref(row(50));
    });
    act(() => result.current.bind('a').onPointerDown({ pointerType: 'mouse', button: 0, clientX: 10, clientY: 25 } as PointerEvent<HTMLElement>));
    act(() => { window.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 10, clientY: 85 })); });
    expect(result.current.draggingId).toBe('a');
    expect(result.current.offsetOf('b')).toBe(-50);
    act(() => { window.dispatchEvent(new window.PointerEvent('pointerup')); });
    expect(result.current.isSettling).toBe(true);
    expect(result.current.offsetOf('a')).toBe(50);
    expect(onCommit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(REORDER_SETTLE_MS); });
    expect(onCommit).toHaveBeenCalledWith(['b', 'a']);
    expect(result.current.draggingId).toBeNull();
    expect(result.current.isSnapping).toBe(true);
    vi.useRealTimers();
  });
});
