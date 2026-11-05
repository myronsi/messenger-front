import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStickyDateBadge } from './useStickyDateBadge';

const at = (element: HTMLElement, top: number) => {
  element.getBoundingClientRect = () => ({ top, bottom: top + 28, left: 0, right: 100, width: 100, height: 28 }) as DOMRect;
};

let container: HTMLDivElement;
let yesterday: HTMLDivElement;
let today: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  yesterday = document.createElement('div');
  today = document.createElement('div');
  for (const [element, label] of [[yesterday, 'Yesterday'], [today, 'Today']] as const) {
    element.className = 'date-separator';
    element.dataset.date = label;
    container.append(element);
  }
  document.body.append(container);
  at(container, 100);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const render = (active: boolean) => renderHook(({ on }) => {
  const result = useStickyDateBadge({ chatContainerRef: { current: container }, active: on, contentKey: 1 });
  if (!result.badgeRef.current) {
    const badge = document.createElement('div');
    Object.defineProperty(badge, 'offsetHeight', { value: 28 });
    result.badgeRef.current = badge;
  }
  return result;
}, { initialProps: { on: active } });

it('lets the next day push the badge up, then hands over without a double badge', () => {
  at(yesterday, 40);
  at(today, 130);
  const { result, rerender } = render(false);
  rerender({ on: true });
  expect(result.current.label).toBe('Yesterday');
  expect(yesterday.hasAttribute('data-covered')).toBe(true);
  expect(today.hasAttribute('data-covered')).toBe(false);
  expect(result.current.badgeRef.current!.style.transform).toBe('translateY(-8px)');

  at(today, 102);
  rerender({ on: false });
  rerender({ on: true });
  expect(result.current.label).toBe('Today');
  expect(today.hasAttribute('data-covered')).toBe(true);
  expect(yesterday.hasAttribute('data-covered')).toBe(false);
  expect(result.current.badgeRef.current!.style.transform).toBe('');

  rerender({ on: false });
  act(() => { vi.advanceTimersByTime(300); });
  expect(today.hasAttribute('data-covered')).toBe(false);
});

it('shows no badge above the first day', () => {
  at(yesterday, 300);
  at(today, 600);
  const { result, rerender } = render(false);
  rerender({ on: true });
  expect(result.current.label).toBeNull();
});
