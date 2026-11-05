import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SwipeProfilePanels } from './SwipeProfilePanels';

function Example() {
  const [active, select] = useState('details');
  return <div data-profile-swipe><SwipeProfilePanels active={active} views={['details', 'photos', 'audios']} onSelect={select}
    renderPanel={view => <div>{view}</div>} /></div>;
}

const start = (root: HTMLElement) => fireEvent.pointerDown(root, { pointerId: 1, pointerType: 'touch', clientX: 250, clientY: 100 });
const move = (root: HTMLElement, x: number, y = 100) => fireEvent.pointerMove(root, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: y });

it('moves both panels with the finger before release and activates the next panel afterward', () => {
  render(<Example />);
  const root = screen.getByTestId('swipe-profile-panels');
  const capture = vi.fn();
  Object.assign(root, { setPointerCapture: capture });
  const current = root.querySelector<HTMLElement>('[data-profile-panel="details"]')!;
  const next = root.querySelector<HTMLElement>('[data-profile-panel="photos"]')!;
  expect(current).toHaveClass('touch-pan-y', 'overflow-y-auto');
  expect(next).toHaveClass('touch-pan-y');
  start(root);
  expect(move(root, 150)).toBe(false);
  expect(capture).toHaveBeenCalledWith(1);
  expect(current.style.transform).toBe('translateX(calc(0% + -100px))');
  expect(next.style.transform).toBe('translateX(calc(100% + -100px))');
  expect(current.style.transition).toBe('none');
  expect(Number(root.parentElement?.style.getPropertyValue('--profile-swipe-next'))).toBeGreaterThan(0);
  expect(current).toHaveAttribute('aria-hidden', 'false');
  expect(next).toHaveAttribute('inert');
  fireEvent.pointerUp(root, { pointerId: 1 });
  expect(next).toHaveAttribute('aria-hidden', 'false');
  expect(next).not.toHaveAttribute('inert');
  expect(next.style.transform).toBe('translateX(calc(0% + 0px))');
  expect(root.parentElement?.style.getPropertyValue('--profile-swipe-next')).toBe('0');
});

it('eases a short drag back, resists gallery edges and leaves vertical scrolling alone', () => {
  render(<Example />);
  const root = screen.getByTestId('swipe-profile-panels');
  const current = root.querySelector<HTMLElement>('[data-profile-panel="details"]')!;
  start(root);
  move(root, 220);
  fireEvent.pointerUp(root, { pointerId: 1 });
  expect(current.style.transform).toBe('translateX(calc(0% + 0px))');
  expect(current.style.transition).toContain('280ms');
  start(root);
  move(root, 350);
  expect(current.style.transform).toBe('translateX(calc(0% + 25px))');
  fireEvent.pointerCancel(root, { pointerId: 1 });
  start(root);
  expect(move(root, 230, 200)).toBe(true);
  expect(current.style.transform).toBe('translateX(calc(0% + 0px))');
});
