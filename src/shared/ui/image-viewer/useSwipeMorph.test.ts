import { expect, it } from 'vitest';
import { morphClip } from './useSwipeMorph';

it('gradually crops a wide photo into a circle instead of changing shape only on release', () => {
  expect(morphClip(600, 600, 800, 400, 1, 0.5, 0)).toBe('inset(150px 0px 150px 0px round 0px)');
  expect(morphClip(600, 600, 800, 400, 1, 0.5, 0.5)).toBe('inset(150px 75px 150px 75px round 75px)');
  expect(morphClip(600, 600, 800, 400, 1, 0.5, 1)).toBe('inset(150px 150px 150px 150px round 150px)');
});

it('uses the target aspect ratio and corner roundness for a rounded thumbnail', () => {
  expect(morphClip(400, 600, 400, 600, 2, 0.1, 1)).toBe('inset(200px 0px 200px 0px round 20px)');
});
