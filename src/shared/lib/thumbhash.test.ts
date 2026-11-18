import { describe, expect, it } from 'vitest';
import { placeholderDataURL, thumbHashAspect, thumbHashToRGBA } from './thumbhash';

const SERVER_RED_400X200 = '2WoDBID0xJuEh4h2d3fwfkq/mA==';
const bytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

describe('thumbhash', () => {
  it('decodes a hash made by the server into the right shape and colour', () => {
    const hash = bytes(SERVER_RED_400X200);
    expect(thumbHashAspect(hash)).toBeGreaterThan(1.5);
    const { w, h, rgba } = thumbHashToRGBA(hash);
    expect(w).toBe(32);
    expect(h).toBeLessThan(20);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      r += rgba[i];
      g += rgba[i + 1];
      b += rgba[i + 2];
    }
    const pixels = rgba.length / 4;
    expect(r / pixels).toBeGreaterThan(180);
    expect(g / pixels).toBeLessThan(90);
    expect(b / pixels).toBeLessThan(90);
  });

  it('gives nothing for missing or broken placeholders', () => {
    expect(placeholderDataURL(undefined)).toBeUndefined();
    expect(placeholderDataURL('!!not base64!!')).toBeUndefined();
    expect(placeholderDataURL('AAA=')).toBeUndefined();
  });
});
