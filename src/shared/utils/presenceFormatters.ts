import type { en } from '@/shared/lang/en';
import { localeOf, type AppLanguage } from '@/shared/lang/languages';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from './dateFormatters';

type PresenceWords = typeof en.presence;
type PluralWords = PresenceWords['minutes'];

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

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return pluralize(words.hours, diffHours, language);

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return words.yesterday;
  if (diffDays < 7) return pluralize(words.days, diffDays, language);

  return words.date.replace('{date}', lastSeenDate.toLocaleDateString(localeOf(language)));
};

export const usePresenceLabel = (isOnline: boolean | undefined, lastSeen: string | null | undefined) => {
  const { language, translations } = useLanguage();
  return getPresenceLabel(isOnline, lastSeen, translations.presence, language);
};
