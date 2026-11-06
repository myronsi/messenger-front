import { describe, expect, it } from 'vitest';
import { locationLabel } from './locationLabel';

describe('locationLabel', () => {
  it('joins the city with the country name in the chosen language', () => {
    expect(locationLabel({ city: 'Berlin', country_code: 'DE', country: 'Germany' }, 'en')).toBe('Berlin, Germany');
    expect(locationLabel({ city: 'Berlin', country_code: 'DE', country: 'Germany' }, 'ru')).toBe('Berlin, Германия');
  });

  it('shows only the country when the city is unknown', () => {
    expect(locationLabel({ city: null, country_code: 'FR', country: 'France' }, 'en')).toBe('France');
  });

  it('falls back to the English country name without a code', () => {
    expect(locationLabel({ city: 'Sydney', country_code: null, country: 'Australia' }, 'ru')).toBe('Sydney, Australia');
  });

  it('returns null when nothing is known', () => {
    expect(locationLabel(null, 'en')).toBeNull();
    expect(locationLabel({ city: null, country_code: null, country: null }, 'en')).toBeNull();
  });
});
