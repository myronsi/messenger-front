import type { en } from '@/shared/lang/en';
import { localeOf, type AppLanguage } from '@/shared/lang/languages';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatTime, parseUtcDate } from './dateFormatters';

type PresenceWords = typeof en.presence;
type PluralWords = PresenceWords['minutes'];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pluralize = (words: PluralWords, count: number, language: AppLanguage) => {
  const category = new Intl.PluralRules(localeOf(language)).select(count);
  const template = category in words ? words[category as keyof PluralWords] : words.other;
  return template.replace('{count}', String(count));
};

export const getPresenceLabel = (
  isOnline: boolean | undefined, lastSeen: string | null | undefined, words: PresenceWords, language: AppLanguage, now = Date.now(),
) => {
  if (isOnline) return words.online;
  if (!lastSeen) return words.offline;

  const lastSeenDate = parseUtcDate(lastSeen);
  if (Number.isNaN(lastSeenDate.getTime())) return words.offline;

  const diffMinutes = Math.max(0, Math.floor((now - lastSeenDate.getTime()) / 60000));
  if (diffMinutes < 1) return words.justNow;
  if (diffMinutes < 60) return pluralize(words.minutes, diffMinutes, language);

  const time = formatTime(lastSeenDate, language);
  const today = new Date(now);
  if (sameDay(lastSeenDate, today)) return words.today.replace('{time}', time);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (sameDay(lastSeenDate, yesterday)) return words.yesterday.replace('{time}', time);

  const date = new Intl.DateTimeFormat(localeOf(language), {
    day: 'numeric', month: 'short', ...(lastSeenDate.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  }).format(lastSeenDate).replace(/\s?г\.$/, '');
  if (now - lastSeenDate.getTime() >= WEEK_MS) return words.longAgo.replace('{date}', date);
  return words.date.replace('{date}', date).replace('{time}', time);
};

export const usePresenceLabel = (isOnline: boolean | undefined, lastSeen: string | null | undefined) => {
  const { language, translations } = useLanguage();
  return getPresenceLabel(isOnline, lastSeen, translations.presence, language);
};
