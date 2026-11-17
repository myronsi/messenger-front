import { describe, expect, it } from 'vitest';
import { clipStartAt, summarizePeaks } from './waveform';

describe('waveform', () => {
  it('reduces samples to normalised bar heights', () => {
    const samples = new Float32Array([0.1, -0.2, 0.5, -1, 0, 0.25, 0.25, -0.5]);
    expect(summarizePeaks(samples, 4).map((peak) => Math.round(peak * 100) / 100)).toEqual([0.2, 1, 0.25, 0.5]);
  });

  it('gives flat bars for silence or no samples', () => {
    expect(summarizePeaks(new Float32Array(8), 2)).toEqual([0.3, 0.3]);
    expect(summarizePeaks(new Float32Array(0), 3)).toEqual([0.3, 0.3, 0.3]);
  });

  it('keeps the dragged clip window inside the song', () => {
    expect(clipStartAt(0.5, 0.1, 0.25)).toBeCloseTo(0.4);
    expect(clipStartAt(0.05, 0.1, 0.25)).toBe(0);
    expect(clipStartAt(0.99, 0.05, 0.25)).toBe(0.75);
  });
});
