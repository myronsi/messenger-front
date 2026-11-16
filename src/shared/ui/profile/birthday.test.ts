import { describe, expect, it } from 'vitest';
import { formatBirthday, isBirthdayToday, isValidBirthday, monthNames } from './birthday';

describe('birthday helpers', () => {
  it('knows today, and moves 29 February to 28 February in other years', () => {
    expect(isBirthdayToday({ day: 15, month: 5, year: null }, new Date(2026, 4, 15, 12))).toBe(true);
    expect(isBirthdayToday({ day: 15, month: 5, year: 1990 }, new Date(2026, 4, 16, 12))).toBe(false);
    expect(isBirthdayToday({ day: 29, month: 2, year: null }, new Date(2027, 1, 28, 12))).toBe(true);
    expect(isBirthdayToday({ day: 29, month: 2, year: null }, new Date(2028, 1, 28, 12))).toBe(false);
    expect(isBirthdayToday({ day: 29, month: 2, year: null }, new Date(2028, 1, 29, 12))).toBe(true);
    expect(isBirthdayToday(null)).toBe(false);
  });

  it('accepts only dates that exist', () => {
    expect(isValidBirthday({ day: 29, month: 2, year: null })).toBe(true);
    expect(isValidBirthday({ day: 29, month: 2, year: 2024 })).toBe(true);
    expect(isValidBirthday({ day: 29, month: 2, year: 2023 })).toBe(false);
    expect(isValidBirthday({ day: 31, month: 4, year: null })).toBe(false);
    expect(isValidBirthday({ day: 1, month: 13, year: null })).toBe(false);
    expect(isValidBirthday({ day: 1, month: 1, year: 1899 })).toBe(false);
  });

  it('formats with or without the year', () => {
    expect(formatBirthday({ day: 3, month: 7, year: null }, 'en-US')).toBe('July 3');
    expect(formatBirthday({ day: 3, month: 7, year: 1995 }, 'en-US')).toBe('July 3, 1995');
    expect(monthNames('en-US')[11]).toBe('December');
  });
});
