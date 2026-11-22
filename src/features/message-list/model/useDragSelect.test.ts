import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, MessageSelection } from '@/entities/message';
import { DRAG_MAX_SPEED, edgeScrollSpeed, useDragSelect } from './useDragSelect';

const message = (id: string): Message => ({ id, sender: 'a', content: id, timestamp: '', type: 'message', read_by: [] });
const messages = ['1', '2', '3'].map(message);

const row = (id: string) => {
  const element = document.createElement('div');
  element.dataset.messageId = id;
  document.body.appendChild(element);
  return element;
};

const touch = (type: string, y: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & { touches: { clientX: number; clientY: number }[] };
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 10, clientY: y }] });
  document.dispatchEvent(event);
  return event;
};

describe('edgeScrollSpeed', () => {
  it('scrolls faster the closer the finger is to the top or bottom edge, and not in the middle', () => {
    expect(edgeScrollSpeed(400, 0, 800)).toBe(0);
    expect(edgeScrollSpeed(0, 0, 800)).toBe(-DRAG_MAX_SPEED);
    expect(edgeScrollSpeed(800, 0, 800)).toBe(DRAG_MAX_SPEED);
    expect(edgeScrollSpeed(780, 0, 800)).toBeGreaterThan(0);
  });
});

describe('useDragSelect', () => {
  const rows = new Map<number, HTMLElement>();
  beforeEach(() => {
    rows.set(100, row('1'));
    rows.set(200, row('2'));
    rows.set(300, row('3'));
    document.elementFromPoint = ((_: number, y: number) => rows.get(y) ?? null) as typeof document.elementFromPoint;
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const selection = (): MessageSelection => ({
    ids: new Set(), active: false, closing: false, toggle: vi.fn(), start: vi.fn(), beginDrag: vi.fn(), dragTo: vi.fn(),
  });

  it('starts selecting on a long press and follows the finger over other messages until it lifts', () => {
    const current = selection();
    const { result } = renderHook(() => useDragSelect({ containerRef: { current: null }, messages, selection: current }));
    result.current?.(messages[0]);
    expect(current.beginDrag).toHaveBeenCalledWith(messages[0]);

    const move = touch('touchmove', 200);
    expect(move.defaultPrevented).toBe(true);
    expect(current.dragTo).toHaveBeenLastCalledWith(messages[1]);
    touch('touchmove', 300);
    expect(current.dragTo).toHaveBeenLastCalledWith(messages[2]);

    touch('touchend', 0);
    touch('touchmove', 100);
    expect(current.dragTo).toHaveBeenCalledTimes(2);
  });

  it('follows the mouse after a long press with the button held, and stops on release', () => {
    const current = selection();
    const { result } = renderHook(() => useDragSelect({ containerRef: { current: null }, messages, selection: current }));
    result.current?.(messages[0], 'mouse');
    const move = new MouseEvent('mousemove', { clientX: 10, clientY: 300, cancelable: true });
    document.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
    expect(current.dragTo).toHaveBeenLastCalledWith(messages[2]);
    const select = new Event('selectstart', { cancelable: true });
    document.dispatchEvent(select);
    expect(select.defaultPrevented).toBe(true);
    document.dispatchEvent(new MouseEvent('mouseup'));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 200 }));
    expect(current.dragTo).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a selection, like in a chat preview', () => {
    const { result } = renderHook(() => useDragSelect({ containerRef: { current: null }, messages }));
    expect(result.current).toBeUndefined();
  });
});
