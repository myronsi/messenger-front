import { localeOf } from '@/shared/lang/languages';
import type { AppLanguage } from '@/shared/lang/languages';
import { timeDate as enDays } from '@/shared/lang/en/timeDate';
import { timeDate as ruDays } from '@/shared/lang/ru/timeDate';
import { timeDate as esDays } from '@/shared/lang/es/timeDate';

const DAY_WORDS: Record<AppLanguage, { today: string; yesterday: string }> = { en: enDays, ru: ruDays, es: esDays };
export const parseUtcDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    const trimmed = date.trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed;
    return new Date(hasTimezone ? normalized : `${normalized}Z`);
  }
  return date;
};

export const formatDate = (date: string | Date, language: AppLanguage) => {
  const dateObj = parseUtcDate(date);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat(localeOf(language, 'en-US'), options).format(dateObj);
};

export const formatDateOnly = (date: string | Date, language: AppLanguage) => {
  const dateObj = parseUtcDate(date);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(localeOf(language, 'en-US'), options).format(dateObj);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatDateLabel = (date: string | Date, language: AppLanguage, today: Date, yesterday: Date): string => {
  const dateObj = parseUtcDate(date);
  const locale = localeOf(language);

  if (dateObj.toDateString() === today.toDateString()) {
    return DAY_WORDS[language].today;
  }

  if (dateObj.toDateString() === yesterday.toDateString()) {
    return DAY_WORDS[language].yesterday;
  }

  const daysAgo = Math.round((startOfDay(today).getTime() - startOfDay(dateObj).getTime()) / DAY_MS);
  if (daysAgo >= 2 && daysAgo <= 6) {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(dateObj);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  const yearAgo = new Date(startOfDay(today));
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const withYear = startOfDay(dateObj) <= yearAgo || daysAgo < 0 && dateObj.getFullYear() !== today.getFullYear();
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
    .format(dateObj)
    .replace(/\s?г\.$/, '');
};

export const formatTime = (date: string | Date, language: AppLanguage): string => {
  const dateObj = parseUtcDate(date);
  return dateObj.toLocaleTimeString(localeOf(language, 'en-US'), { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
