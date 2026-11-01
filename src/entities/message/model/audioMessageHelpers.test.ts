import { describe, expect, it } from 'vitest';
import { FALLBACK_WAVEFORM, normalizeWaveform, WAVEFORM_BAR_COUNT } from './audioMessageHelpers';

describe('voice waveform amplitudes', () => {
  it('converts byte amplitudes without producing bars larger than the player', () => {
    const waveform = normalizeWaveform([0, 64, 128, 255]);
    expect(waveform).toHaveLength(WAVEFORM_BAR_COUNT);
    expect(waveform[0]).toBe(0);
    expect(waveform[waveform.length - 1]).toBe(1);
    expect(waveform.every(value => value >= 0 && value <= 1)).toBe(true);
  });
  it('retains normalized local waveforms and resamples long recordings', () => {
    expect(normalizeWaveform(Array(100).fill(0.5))).toEqual(Array(WAVEFORM_BAR_COUNT).fill(0.5));
  });
  it('uses the fallback for missing or corrupt metadata and clamps negative amplitudes', () => {
    expect(normalizeWaveform([NaN])).toBe(FALLBACK_WAVEFORM);
    expect(normalizeWaveform([])).toBe(FALLBACK_WAVEFORM);
    expect(normalizeWaveform([-5, 0, 255]).every(value => value >= 0 && value <= 1)).toBe(true);
  });
});
