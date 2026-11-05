import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGallerySwipe } from './useGallerySwipe';

afterEach(() => vi.unstubAllGlobals());

it.each([1, -1] as const)('settles a swipe in direction %s from its released position and cleans up', (direction) => {
  const current = document.createElement('img');
  current.setAttribute('data-active-slide', '');
  const outgoing = document.createElement('div');
  outgoing.dataset.testid = `image-viewer-${direction === 1 ? 'previous' : 'next'}-slide`;
  const stage = document.createElement('div');
  Object.defineProperty(stage, 'clientWidth', { value: 400 });
  stage.append(current, outgoing);
  const cancel = vi.fn();
  current.animate = vi.fn(() => ({ cancel }) as unknown as Animation);
  outgoing.animate = vi.fn(() => ({ cancel }) as unknown as Animation);
  const ref = { current: stage };
  const go = vi.fn();
  const { result, rerender, unmount } = renderHook(({ index }) => useGallerySwipe(ref, index, 3, go), { initialProps: { index: 1 } });
  act(() => result.current(direction, -direction * 120));
  expect(go).toHaveBeenCalledWith(direction);
  rerender({ index: 1 + direction });
  expect(current.animate).toHaveBeenCalledWith([
    { transform: `translateX(${direction * 280}px)` }, { transform: 'translateX(0px)' },
  ], expect.objectContaining({ duration: 280 }));
  expect(outgoing.animate).toHaveBeenCalledWith([
    { transform: `translateX(${-direction * 120}px)` }, { transform: `translateX(${-direction * 400}px)` },
  ], expect.anything());
  unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
});

it('does not animate when reduced motion is requested or navigate past the edge', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const stage = document.createElement('div');
  const image = document.createElement('img');
  image.setAttribute('data-active-slide', '');
  image.animate = vi.fn();
  stage.append(image);
  const ref = { current: stage };
  const go = vi.fn();
  const { result, rerender } = renderHook(({ index }) => useGallerySwipe(ref, index, 2, go), { initialProps: { index: 0 } });
  act(() => result.current(-1, 100));
  expect(go).not.toHaveBeenCalled();
  act(() => result.current(1, -100));
  rerender({ index: 1 });
  expect(image.animate).not.toHaveBeenCalled();
});

it('slides a button navigation in from the full viewport width', () => {
  const stage = document.createElement('div');
  Object.defineProperty(stage, 'clientWidth', { value: 400 });
  const image = document.createElement('img');
  image.setAttribute('data-active-slide', '');
  image.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  stage.append(image);
  const ref = { current: stage };
  const go = vi.fn();
  const { result, rerender } = renderHook(({ index }) => useGallerySwipe(ref, index, 2, go), { initialProps: { index: 0 } });
  act(() => result.current(1, 0));
  rerender({ index: 1 });
  expect(image.animate).toHaveBeenCalledWith([
    { transform: 'translateX(400px)' }, { transform: 'translateX(0px)' },
  ], expect.objectContaining({ duration: 280 }));
});
