import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSwipeToMinimize } from './useSwipeToMinimize';

const touch = (target: HTMLElement, type: string, y: number, time: number, x = 100) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
  Object.defineProperty(event, 'timeStamp', { value: time });
  target.dispatchEvent(event);
  return event;
};

describe('useSwipeToMinimize', () => {
  let view: HTMLDivElement;
  beforeEach(() => {
    view = document.createElement('div');
    document.body.append(view);
    Object.assign(window, { innerHeight: 800 });
  });

  it('follows the finger without fading and minimizes after a long pull', () => {
    const minimize = vi.fn();
    renderHook(() => useSwipeToMinimize(view, minimize));
    touch(view, 'touchstart', 100, 0);
    const move = touch(view, 'touchmove', 300, 400);
    expect(move.defaultPrevented).toBe(true);
    expect(view.style.transform).toBe('translateY(200px) scale(0.9)');
    expect(view.style.opacity).toBe('');
    touch(view, 'touchend', 300, 410);
    expect(minimize).toHaveBeenCalledWith({ offset: 200, scale: 0.9 });
  });

  it('springs back after a short slow pull', () => {
    const minimize = vi.fn();
    renderHook(() => useSwipeToMinimize(view, minimize));
    touch(view, 'touchstart', 100, 0);
    touch(view, 'touchmove', 160, 600);
    touch(view, 'touchend', 160, 610);
    expect(minimize).not.toHaveBeenCalled();
    expect(view.style.transform).toBe('');
  });

  it('leaves sideways moves, upward moves and scrolled content alone', () => {
    const minimize = vi.fn();
    const list = document.createElement('div');
    view.append(list);
    Object.defineProperty(list, 'scrollTop', { value: 40 });
    Object.defineProperty(list, 'scrollHeight', { value: 900 });
    Object.defineProperty(list, 'clientHeight', { value: 300 });
    renderHook(() => useSwipeToMinimize(view, minimize));
    touch(view, 'touchstart', 100, 0);
    expect(touch(view, 'touchmove', 110, 50, 200).defaultPrevented).toBe(false);
    touch(view, 'touchend', 110, 60);
    touch(view, 'touchstart', 300, 0);
    expect(touch(view, 'touchmove', 100, 50).defaultPrevented).toBe(false);
    touch(view, 'touchend', 100, 60);
    touch(list, 'touchstart', 100, 0);
    expect(touch(list, 'touchmove', 400, 100).defaultPrevented).toBe(false);
    touch(list, 'touchend', 400, 110);
    expect(minimize).not.toHaveBeenCalled();
  });
});
