import { describe, expect, it } from 'vitest';
import { formatDateLabel } from './dateFormatters';

const today = new Date(2026, 10, 5, 15, 0);
const yesterday = new Date(2026, 10, 4, 12, 0);
const local = (month: number, day: number, year = 2026, hour = 10) => new Date(year, month, day, hour, 0);
const label = (date: Date, language: 'en' | 'ru' = 'en') => formatDateLabel(date, language, today, yesterday);

describe('formatDateLabel', () => {
  it('says today and yesterday', () => {
    expect(label(local(10, 5, 2026, 0))).toBe('Today');
    expect(label(local(10, 4, 2026, 23))).toBe('Yesterday');
    expect(label(local(10, 5), 'ru')).toBe('Сегодня');
    expect(label(local(10, 4), 'ru')).toBe('Вчера');
  });

  it('names the weekday for the rest of the last week', () => {
    expect(label(local(10, 3))).toBe('Tuesday');
    expect(label(local(9, 30))).toBe('Friday');
    expect(label(local(10, 3), 'ru')).toBe('Вторник');
  });

  it('shows day and month within a year and adds the year after that', () => {
    expect(label(local(9, 29))).toBe('29 October');
    expect(label(local(11, 10, 2025))).toBe('10 December');
    expect(label(local(10, 6, 2025))).toBe('6 November');
    expect(label(local(10, 5, 2025))).toBe('5 November 2025');
    expect(label(local(2, 1, 2024))).toBe('1 March 2024');
    expect(label(local(9, 29), 'ru')).toBe('29 октября');
    expect(label(local(2, 1, 2024), 'ru')).toBe('1 марта 2024');
  });
});
