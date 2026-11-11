import { expect, it } from 'vitest';
import { createPinchTracker } from './pinchTracker';

it('reports how much two fingers spread or pinch since the last move', () => {
  const pinch = createPinchTracker();
  pinch.down(1, 0, 0);
  expect(pinch.move(1, 5, 0)).toBeNull();
  pinch.down(2, 105, 0);
  expect(pinch.pinching).toBe(true);
  expect(pinch.move(2, 205, 0)).toBe(2);
  expect(pinch.move(1, 105, 0)).toBe(0.5);
  pinch.up(2);
  expect(pinch.pinching).toBe(false);
  expect(pinch.move(1, 0, 0)).toBeNull();
});

it('ignores a third finger and unknown pointers', () => {
  const pinch = createPinchTracker();
  pinch.down(1, 0, 0);
  pinch.down(2, 100, 0);
  pinch.down(3, 500, 500);
  expect(pinch.move(3, 600, 600)).toBeNull();
  expect(pinch.move(9, 1, 1)).toBeNull();
});
