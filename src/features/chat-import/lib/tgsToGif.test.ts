import { gzipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readTgs, TGS_FPS, TGS_MAX_SECONDS, tgsFrameTimes, tgsToGif } from './tgsToGif';

const tgs = (data: unknown) => new Blob([gzipSync(strToU8(JSON.stringify(data)))]);

describe('tgsToGif', () => {
  it('reads the Lottie data inside a .tgs file', async () => {
    expect(await readTgs(tgs({ fr: 60, ip: 0, op: 180 }))).toEqual({ fr: 60, ip: 0, op: 180 });
    expect(await readTgs(new Blob(['not gzip']))).toBeNull();
  });

  it('samples at most three seconds at a steady rate', () => {
    const times = tgsFrameTimes({ fr: 60, ip: 0, op: 600 });
    expect(times).toHaveLength(TGS_FPS * TGS_MAX_SECONDS);
    expect(times[1] - times[0]).toBe(60 / TGS_FPS);
    expect(tgsFrameTimes({ fr: 30, ip: 10, op: 40 })).toEqual(Array.from({ length: TGS_FPS }, (_, i) => 10 + (i * 30) / TGS_FPS));
  });

  it('gives up on a broken file', async () => {
    expect(await tgsToGif(new Blob(['broken']))).toBeNull();
  });
});
