import { describe, expect, it } from 'vitest';
import { countdownProgress, formatCountdown } from './countdown';

describe('formatCountdown', () => {
  it('formats seconds as m:ss', () => {
    expect(formatCountdown(462)).toBe('7:42');
    expect(formatCountdown(48)).toBe('0:48');
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(5)).toBe('0:05');
  });

  it('never shows negative or fractional time', () => {
    expect(formatCountdown(-3)).toBe('0:00');
    expect(formatCountdown(59.9)).toBe('0:59');
  });
});

describe('countdownProgress', () => {
  it('is the remaining share of the total time, clamped to 0..1', () => {
    expect(countdownProgress(300, 600)).toBe(0.5);
    expect(countdownProgress(700, 600)).toBe(1);
    expect(countdownProgress(-1, 600)).toBe(0);
    expect(countdownProgress(10, 0)).toBe(0);
  });
});
