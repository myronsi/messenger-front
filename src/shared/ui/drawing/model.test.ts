import { describe, expect, it } from 'vitest';
import { coordinateCount, hitsItem, roundCoordinate, shouldExtend, toDrawing, type DrawingItem } from './model';

const stroke: DrawingItem = { type: 'stroke', color: '#ff0000', width: 0.01, points: [0.1, 0.1, 0.9, 0.1] };
const label: DrawingItem = { type: 'text', color: '#ffffff', x: 0.5, y: 0.5, size: 0.05, text: 'hi' };

describe('drawing model', () => {
  it('builds a drawing only when there are items', () => {
    expect(toDrawing([])).toBeNull();
    expect(toDrawing([stroke])).toEqual({ version: 1, items: [stroke] });
  });

  it('rounds and clamps coordinates to the image', () => {
    expect(roundCoordinate(0.123456)).toBe(0.1235);
    expect(roundCoordinate(1.4)).toBe(1);
    expect(roundCoordinate(-0.2)).toBe(0);
  });

  it('skips points that are too close to the last one', () => {
    expect(shouldExtend([], 0.5, 0.5)).toBe(true);
    expect(shouldExtend([0.5, 0.5], 0.5005, 0.5)).toBe(false);
    expect(shouldExtend([0.5, 0.5], 0.51, 0.5)).toBe(true);
  });

  it('counts the numbers of all strokes', () => {
    expect(coordinateCount([stroke, label, stroke])).toBe(8);
  });

  it('finds strokes and text labels under the eraser', () => {
    expect(hitsItem(stroke, 0.5, 0.11, 1, 0.02)).toBe(true);
    expect(hitsItem(stroke, 0.5, 0.5, 1, 0.02)).toBe(false);
    expect(hitsItem(label, 0.51, 0.52, 1, 0.01)).toBe(true);
    expect(hitsItem(label, 0.2, 0.2, 1, 0.01)).toBe(false);
  });
});
