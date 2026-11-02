import { describe, expect, it } from 'vitest';
import { IDENTITY, MAX_SCALE, clampZoomPan, panBy, pinchTo, wheelZoomFactor, zoomAt } from './zoomPan';

const image = { width: 400, height: 300 };
const stage = { width: 800, height: 600 };

describe('zoomPan', () => {
  it('keeps the point under the cursor in place while zooming', () => {
    const view = zoomAt(IDENTITY, 4, { x: 100, y: 50 }, image, stage);
    expect(view).toEqual({ scale: 4, x: -300, y: -150 });
  });

  it('keeps the pinched point under the fingers while they zoom and move', () => {
    expect(pinchTo({ scale: 2, x: 0, y: 0 }, 3, { x: 100, y: 50 }, { x: 130, y: 70 }, image, stage)).toEqual({ scale: 3, x: -20, y: -5 });
  });

  it('cannot move a fitted image away from the center', () => {
    expect(panBy(IDENTITY, 300, -200, image, stage)).toEqual(IDENTITY);
  });

  it('lets a zoomed image move only until its edge reaches the stage edge', () => {
    const zoomed = { scale: 4, x: 0, y: 0 };
    expect(panBy(zoomed, 1000, -1000, image, stage)).toEqual({ scale: 4, x: 400, y: -300 });
  });

  it('keeps the scale between fitted and the maximum', () => {
    expect(clampZoomPan({ scale: 0.2, x: 50, y: 50 }, image, stage)).toEqual(IDENTITY);
    expect(clampZoomPan({ scale: 99, x: 0, y: 0 }, image, stage).scale).toBe(MAX_SCALE);
  });

  it('zooms in for wheel up and out for wheel down, also in line mode', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(3, 1)).toBeCloseTo(wheelZoomFactor(99), 5);
  });
});
