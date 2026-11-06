import { describe, expect, it } from 'vitest';
import { countdownProgress, formatCountdown, localDeadline, receivedRemainingMs, secondsUntil } from './countdown';

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

describe('local deadlines for objects received from the server', () => {
  const ttl = 120_000;
  const receivedAt = Date.parse('2026-11-06T10:00:00Z');

  it('keeps the server time left when the clocks agree', () => {
    expect(receivedRemainingMs('2026-11-06T10:01:30Z', ttl, receivedAt)).toBe(90_000);
    expect(localDeadline('2026-11-06T10:01:30Z', ttl, receivedAt)).toBe(receivedAt + 90_000);
  });

  it('falls back to the known lifetime when the device clock is fast or slow', () => {
    expect(receivedRemainingMs('2026-11-06T10:02:00Z', ttl, receivedAt + 5 * 60_000)).toBe(ttl);
    expect(receivedRemainingMs('2026-11-06T10:02:00Z', ttl, receivedAt - 10 * 60_000)).toBe(ttl);
    expect(receivedRemainingMs('not a date', ttl, receivedAt)).toBe(ttl);
  });

  it('counts whole seconds down to zero', () => {
    expect(secondsUntil(receivedAt + 1_500, receivedAt)).toBe(2);
    expect(secondsUntil(receivedAt, receivedAt + 1)).toBe(0);
  });
});
