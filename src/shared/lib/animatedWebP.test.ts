import { describe, expect, it } from 'vitest';
import { isAnimatedWebP, isAnimatedWebPHeader } from './animatedWebP';

const header = (chunk: string, flags: number) => {
  const bytes = new Uint8Array(30);
  bytes.set([...`RIFF\0\0\0\0WEBP${chunk}`].map((c) => c.charCodeAt(0)), 0);
  bytes[20] = flags;
  return bytes;
};

describe('animated WebP detection', () => {
  it('finds the animation flag of an extended WebP', () => {
    expect(isAnimatedWebPHeader(header('VP8X', 0x02))).toBe(true);
    expect(isAnimatedWebPHeader(header('VP8X', 0x10))).toBe(false);
    expect(isAnimatedWebPHeader(header('VP8 ', 0x02))).toBe(false);
    expect(isAnimatedWebPHeader(new Uint8Array(8))).toBe(false);
  });

  it('reads the header of a file', async () => {
    await expect(isAnimatedWebP(new Blob([header('VP8X', 0x12)]))).resolves.toBe(true);
    await expect(isAnimatedWebP(new Blob(['not a webp at all, just text']))).resolves.toBe(false);
  });
});
