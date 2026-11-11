import { expect, it } from 'vitest';
import { moveTo } from './reorder';

it('moves a sticker to any position for dragging and making a cover', () => {
  expect(moveTo(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  expect(moveTo(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  expect(moveTo(['a', 'b'], 1, 5)).toEqual(['a', 'b']);
});
