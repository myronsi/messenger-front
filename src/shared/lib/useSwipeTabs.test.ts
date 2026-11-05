import { renderHook } from '@testing-library/react';
import type { PointerEvent, MouseEvent } from 'react';
import { expect, it, vi } from 'vitest';
import { useSwipeTabs } from './useSwipeTabs';

function setup(active = 'photos', tabs = ['details', 'photos', 'audios'], enabled = true) {
  const select = vi.fn();
  const root = document.createElement('div');
  const { result } = renderHook(() => useSwipeTabs(active, tabs, select, enabled));
  const touch = (x: number, y: number, target: Element = root) => (
    { currentTarget: root, target, pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, preventDefault: vi.fn() }
  ) as unknown as PointerEvent<HTMLElement>;
  const drag = (x: number, y = 0, target: Element = root) => {
    result.current.onPointerDown(touch(200, 200, target));
    result.current.onPointerMove(touch(200 + x, 200 + y, target));
    result.current.onPointerUp(touch(200, 200));
  };
  return { select, root, result, touch, drag };
}

it('navigates to the next and previous visible sections', () => {
  const { drag, select } = setup();
  drag(-100);
  expect(select).toHaveBeenLastCalledWith('audios');
  drag(100);
  expect(select).toHaveBeenLastCalledWith('details');
});

it('skips unavailable sections and stays inside the first/last boundaries', () => {
  const { drag, select } = setup('details', ['details', 'audios']);
  drag(100);
  expect(select).not.toHaveBeenCalled();
  drag(-100);
  expect(select).toHaveBeenCalledWith('audios');
  const last = setup('audios');
  last.drag(-100);
  expect(last.select).not.toHaveBeenCalled();
});

it('ignores short drags, vertical scrolling, cancelled gestures and disabled navigation', () => {
  const { drag, select, result, touch } = setup();
  drag(30);
  drag(-100, 160);
  result.current.onPointerDown(touch(200, 200));
  result.current.onPointerMove(touch(100, 200));
  result.current.onPointerCancel();
  result.current.onPointerUp(touch(200, 200));
  expect(select).not.toHaveBeenCalled();
  const blocked = setup('photos', ['details', 'photos'], false);
  blocked.drag(100);
  expect(blocked.select).not.toHaveBeenCalled();
});

it('does not navigate from text fields or a nested dialog', () => {
  const { root, drag, select } = setup();
  const input = document.createElement('input');
  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  root.append(input, modal);
  drag(-100, 0, input);
  drag(-100, 0, modal);
  expect(select).not.toHaveBeenCalled();
});

it('suppresses the trailing click after a swipe but allows the next tap', () => {
  const { drag, result, touch } = setup();
  drag(-100);
  const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
  result.current.onClickCapture(click);
  expect(click.preventDefault).toHaveBeenCalledOnce();
  result.current.onPointerDown(touch(200, 200));
  result.current.onClickCapture(click);
  expect(click.preventDefault).toHaveBeenCalledOnce();
});
