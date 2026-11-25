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

it('never shows the old day back in place while the next day takes over', () => {
  at(yesterday, 40);
  at(today, 108);
  const badge = document.createElement('div');
  Object.defineProperty(badge, 'offsetHeight', { value: 28 });
  let rendered: string | null = null;
  const seen: { transform: string; label: string | null }[] = [];
  let transform = '';
  Object.defineProperty(badge.style, 'transform', {
    configurable: true,
    get: () => transform,
    set: (value: string) => { transform = value; seen.push({ transform: value, label: rendered }); },
  });
  const { rerender } = renderHook(({ on }) => {
    const result = useStickyDateBadge({ chatContainerRef: { current: container }, active: on, contentKey: 1 });
    result.badgeRef.current = badge;
    rendered = result.label;
    return result;
  }, { initialProps: { on: false } });
  rerender({ on: true });
  expect(rendered).toBe('Yesterday');
  expect(transform).toBe('translateY(-30px)');

  seen.length = 0;
  at(today, 101);
  act(() => {
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
  });
  expect(rendered).toBe('Today');
  expect(transform).toBe('');
  expect(seen.some((entry) => entry.transform === '' && entry.label === 'Yesterday')).toBe(false);
});

it('measures from below the pinned bar, where the badge is drawn', () => {
  container.style.setProperty('--pinned-inset', '60px');
  at(yesterday, 40);
  at(today, 130);
  const { result, rerender } = render(false);
  rerender({ on: true });
  expect(result.current.label).toBe('Today');
  expect(today.hasAttribute('data-covered')).toBe(true);
  expect(result.current.badgeRef.current!.style.transform).toBe('');
});
