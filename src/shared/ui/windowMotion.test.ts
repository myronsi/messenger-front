import { expect, it } from 'vitest';
import { mobileWindowSlide, windowSlide } from './windowMotion';

it('gives every window the same slide from the right edge', () => {
  expect(windowSlide(true)).toBe('motion-window-slide translate-x-0');
  expect(windowSlide(false)).toBe('motion-window-slide translate-x-full');
  expect(mobileWindowSlide(true)).toBe('max-sm:motion-window-slide max-sm:translate-x-0');
  expect(mobileWindowSlide(false)).toBe('max-sm:motion-window-slide max-sm:translate-x-full');
});
