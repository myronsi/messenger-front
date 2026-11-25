import { describe, expect, it } from 'vitest';
import { buildLocation, wrapLongitude } from './locationDraft';

describe('location draft', () => {
  it('rounds to 6 decimals and keeps the accuracy of my current location', () => {
    expect(buildLocation({ lat: 48.13715412345, lon: 11.57612398765 }, 24.6, ' Office ')).toEqual({
      latitude: 48.137154, longitude: 11.576124, accuracy_m: 25, title: 'Office',
    });
  });

  it('leaves out an empty name and the accuracy of a placed pin', () => {
    expect(buildLocation({ lat: 1, lon: 2 }, null, '  ')).toEqual({ latitude: 1, longitude: 2 });
  });

  it('keeps coordinates and accuracy inside what the server accepts', () => {
    expect(buildLocation({ lat: 95, lon: 200 }, 50_000, 'x'.repeat(150))).toEqual({
      latitude: 90, longitude: -160, accuracy_m: 10_000, title: 'x'.repeat(100),
    });
    expect(wrapLongitude(-190)).toBe(170);
  });
});
