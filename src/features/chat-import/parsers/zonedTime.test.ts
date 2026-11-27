import { describe, expect, it } from 'vitest';
import { browserTimeZone, isTimeZone, timeZoneOptions, zonedToUtc } from './zonedTime';

const iso = (wall: number, zone: string) => new Date(zonedToUtc(wall, zone)).toISOString();

describe('zonedToUtc', () => {
  it('reads wall clock times in the given zone, summer and winter', () => {
    expect(iso(Date.UTC(2026, 0, 15, 12, 0), 'Europe/Berlin')).toBe('2026-01-15T11:00:00.000Z');
    expect(iso(Date.UTC(2026, 6, 15, 12, 0), 'Europe/Berlin')).toBe('2026-07-15T10:00:00.000Z');
    expect(iso(Date.UTC(2026, 6, 15, 12, 0), 'America/New_York')).toBe('2026-07-15T16:00:00.000Z');
    expect(iso(Date.UTC(2026, 6, 15, 12, 0), 'UTC')).toBe('2026-07-15T12:00:00.000Z');
  });

  it('handles the hour after the clocks go forward', () => {
    expect(iso(Date.UTC(2026, 2, 29, 3, 30), 'Europe/Berlin')).toBe('2026-03-29T01:30:00.000Z');
  });

  it('knows the zones', () => {
    expect(isTimeZone('Europe/Berlin')).toBe(true);
    expect(isTimeZone('Mars/Base')).toBe(false);
    expect(timeZoneOptions()).toContain(browserTimeZone());
    expect(timeZoneOptions()).toContain('UTC');
  });
});
