import type { components } from '@/shared/api/generated/schema';

export type BirthdayValue = components['schemas']['Birthday'];

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const isBirthdayToday = (birthday: BirthdayValue | null | undefined, now = new Date()) => {
  if (!birthday) return false;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (birthday.month === month && birthday.day === day) return true;
  return birthday.month === 2 && birthday.day === 29 && month === 2 && day === 28 && !isLeapYear(now.getFullYear());
};

export const isValidBirthday = ({ day, month, year }: BirthdayValue) => {
  if (!Number.isInteger(day) || !Number.isInteger(month) || month < 1 || month > 12 || day < 1) return false;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) return false;
  const date = new Date(Date.UTC(year ?? 2000, month - 1, day));
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1;
};

export const formatBirthday = (birthday: BirthdayValue, locale: string) => {
  const date = new Date(Date.UTC(birthday.year ?? 2000, birthday.month - 1, birthday.day));
  const options: Intl.DateTimeFormatOptions = birthday.year === null
    ? { day: 'numeric', month: 'long', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
  return date.toLocaleDateString(locale, options);
};

export const monthNames = (locale: string) => Array.from({ length: 12 }, (_, index) => (
  new Date(Date.UTC(2000, index, 1)).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })
));

export type BirthdayField = 'day' | 'month' | 'year';

export const birthdayFieldOrder = (locale: string): BirthdayField[] => {
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(2000, 10, 25)));
  const order = parts.map((part) => part.type).filter((type): type is BirthdayField => type === 'day' || type === 'month' || type === 'year');
  return order.length === 3 ? order : ['day', 'month', 'year'];
};

export const daysInMonth = (month: number, year: number | null) => new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();

export const birthdayYears = (now = new Date(), oldest = 1900) => (
  Array.from({ length: now.getFullYear() - oldest + 1 }, (_, index) => now.getFullYear() - index)
);
