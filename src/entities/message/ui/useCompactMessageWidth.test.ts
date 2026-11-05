import { expect, it, vi } from 'vitest';
import { compactMessageWidth } from './useCompactMessageWidth';

it('removes excess width without adding a line of height', () => {
  const height = vi.fn((width: number) => width >= 210 ? 72 : 96);
  const width = compactMessageWidth(300, 90, height);
  expect(width).toBeGreaterThanOrEqual(210);
  expect(width).toBeLessThanOrEqual(211);
  expect(height(width)).toBe(height(300));
  expect(height.mock.calls.length).toBeLessThanOrEqual(15);
});

it('retains the inline timestamp space on a short message', () => {
  const height = (width: number) => width >= 145 ? 24 : 48;
  expect(compactMessageWidth(145, 90, height)).toBe(145);
});

it('caps the timestamp reservation at the available width on very narrow layouts', () => {
  expect(compactMessageWidth(80, 120, () => 48)).toBe(80);
});
