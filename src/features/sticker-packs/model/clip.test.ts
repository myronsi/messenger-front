import { describe, expect, it } from 'vitest';
import { adjustTrim, clipKind, cropFractions, cropStyle, gifDurationMs, initialTrim, isClipType } from './clip';
import { coverZoom } from './crop';

const gif = (delays: number[]) => {
  const bytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0];
  delays.forEach((delay) => {
    bytes.push(0x21, 0xf9, 4, 0, delay & 0xff, delay >> 8, 0, 0);
    bytes.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x4c, 0x01, 0);
  });
  bytes.push(0x3b);
  return new Uint8Array(bytes).buffer;
};

describe('video sticker clips', () => {
  it('treats videos and GIFs as clips and sends a GIF as an image', () => {
    expect(isClipType('video/mp4')).toBe(true);
    expect(isClipType('image/gif')).toBe(true);
    expect(isClipType('image/png')).toBe(false);
    expect(clipKind('image/gif')).toBe('image');
    expect(clipKind('video/quicktime')).toBe('video');
  });

  it('keeps the first 3 seconds by default', () => {
    expect(initialTrim(10_000)).toEqual([0, 3000]);
    expect(initialTrim(1200)).toEqual([0, 1200]);
  });

  it('never keeps more than 3 seconds, moving the other end along', () => {
    expect(adjustTrim([0, 3000], [0, 2000], 10_000)).toEqual([0, 2000]);
    expect(adjustTrim([0, 3000], [0, 5000], 10_000)).toEqual([2000, 5000]);
    expect(adjustTrim([2000, 5000], [1000, 5000], 10_000)).toEqual([1000, 4000]);
    expect(adjustTrim([8000, 10_000], [6500, 10_000], 10_000)).toEqual([6500, 9500]);
  });

  it('turns the shown square into crop fractions of the frame', () => {
    const wide = { width: 1920, height: 1080 };
    expect(cropFractions(wide, { zoom: coverZoom(wide), x: 0, y: 0 })).toEqual({ x: expect.closeTo(0.21875, 6), y: 0, size: expect.closeTo(1, 6) });
    const zoomed = cropFractions(wide, { zoom: coverZoom(wide) * 2, x: 0, y: 0 });
    expect(zoomed.size).toBeCloseTo(0.5, 6);
    expect(zoomed.y).toBeCloseTo(0.25, 6);
    expect(cropFractions(wide, { zoom: coverZoom(wide), x: 5, y: 0 }).x).toBe(0);
  });

  it('places the frame so the cropped square fills the preview', () => {
    expect(cropStyle({ width: 1920, height: 1080 }, { x: 0.25, y: 0, size: 1 })).toEqual({ width: '177.77777777777777%', height: '100%', left: '-44.44444444444444%', top: '0%' });
    expect(cropStyle({ width: 1000, height: 1000 }, { x: 0.25, y: 0.25, size: 0.5 })).toEqual({ width: '200%', height: '200%', left: '-50%', top: '-50%' });
  });

  it('reads the length of a GIF from its frame delays', () => {
    expect(gifDurationMs(gif([50, 100, 25]))).toBe(1750);
    expect(gifDurationMs(gif([0, 0]))).toBe(200);
    expect(gifDurationMs(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });
});
