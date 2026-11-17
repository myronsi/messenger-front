import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { es } from '@/shared/lang/es';
import { ru } from '@/shared/lang/ru';
import { formatTime } from './dateFormatters';
import { getPresenceLabel } from './presenceFormatters';

const now = new Date(2026, 10, 8, 12, 0).getTime();
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();
const at = (year: number, month: number, day: number, hour: number, minute: number) => new Date(year, month, day, hour, minute).toISOString();

describe('getPresenceLabel', () => {
  it('shows online and offline in each language', () => {
    expect(getPresenceLabel(true, null, en.presence, 'en', now)).toBe('online');
    expect(getPresenceLabel(true, null, ru.presence, 'ru', now)).toBe('в сети');
    expect(getPresenceLabel(true, null, es.presence, 'es', now)).toBe('en línea');
    expect(getPresenceLabel(false, null, es.presence, 'es', now)).toBe('desconectado');
    expect(getPresenceLabel(false, 'not a date', en.presence, 'en', now)).toBe('offline');
  });

  it('counts minutes during the first hour', () => {
    expect(getPresenceLabel(false, ago(0), en.presence, 'en', now)).toBe('last seen just now');
    expect(getPresenceLabel(false, ago(1), en.presence, 'en', now)).toBe('last seen 1 minute ago');
    expect(getPresenceLabel(false, ago(5), en.presence, 'en', now)).toBe('last seen 5 minutes ago');
    expect(getPresenceLabel(false, ago(3), ru.presence, 'ru', now)).toBe('был(а) 3 минуты назад');
    expect(getPresenceLabel(false, ago(5), ru.presence, 'ru', now)).toBe('был(а) 5 минут назад');
    expect(getPresenceLabel(false, ago(21), ru.presence, 'ru', now)).toBe('был(а) 21 минуту назад');
    expect(getPresenceLabel(false, ago(10), es.presence, 'es', now)).toBe('visto hace 10 minutos');
  });

  it('names the exact time for today and yesterday', () => {
    const today = at(2026, 10, 8, 9, 30);
    const yesterday = at(2026, 10, 7, 23, 45);
    expect(getPresenceLabel(false, today, en.presence, 'en', now)).toBe(`last seen at ${formatTime(today, 'en')}`);
    expect(getPresenceLabel(false, yesterday, en.presence, 'en', now)).toBe(`last seen yesterday at ${formatTime(yesterday, 'en')}`);
    expect(getPresenceLabel(false, today, ru.presence, 'ru', now)).toBe('был(а) в 09:30');
    expect(getPresenceLabel(false, yesterday, es.presence, 'es', now)).toBe('visto ayer a las 23:45');
  });

  it('names the date and time within the last week', () => {
    expect(getPresenceLabel(false, at(2026, 10, 3, 10, 15), ru.presence, 'ru', now)).toBe('был(а) 3 нояб. в 10:15');
    expect(getPresenceLabel(false, at(2026, 10, 3, 10, 15), es.presence, 'es', now)).toBe('visto el 3 nov a las 10:15');
  });

  it('shows only the date after a week and adds the year only when it differs', () => {
    expect(getPresenceLabel(false, at(2026, 10, 1, 10, 15), ru.presence, 'ru', now)).toBe('был(а) 1 нояб.');
    expect(getPresenceLabel(false, at(2025, 11, 31, 8, 5), ru.presence, 'ru', now)).toBe('был(а) 31 дек. 2025');
    expect(getPresenceLabel(false, at(2026, 9, 20, 18, 0), en.presence, 'en', now)).toBe('last seen 20 Oct');
  });

  it('has a short wording for tight places in each language', () => {
    const yesterday = at(2026, 10, 7, 23, 45);
    const time = (language: 'en' | 'ru' | 'es') => formatTime(yesterday, language);
    const short = <T extends { short: object }>(words: T) => ({ ...words, ...words.short });
    expect(getPresenceLabel(false, yesterday, short(en.presence), 'en', now)).toBe(`seen yesterday, ${time('en')}`);
    expect(getPresenceLabel(false, yesterday, short(ru.presence), 'ru', now)).toBe(`был(а) вчера, ${time('ru')}`);
    expect(getPresenceLabel(false, yesterday, short(es.presence), 'es', now)).toBe(`visto ayer, ${time('es')}`);
    expect(getPresenceLabel(false, ago(5), short(en.presence), 'en', now)).toBe('seen 5 min ago');
    expect(getPresenceLabel(true, null, short(en.presence), 'en', now)).toBe('online');
  });

  it('leaves out the word today, since a time without a day already means today', () => {
    const earlier = at(2026, 10, 8, 6, 48);
    const time = formatTime(earlier, 'en');
    expect(getPresenceLabel(false, earlier, en.presence, 'en', now)).toBe(`last seen at ${time}`);
    expect(getPresenceLabel(false, earlier, { ...en.presence, ...en.presence.short }, 'en', now)).toBe(`seen at ${time}`);
    expect(getPresenceLabel(false, earlier, es.presence, 'es', now)).toBe(`visto a las ${formatTime(earlier, 'es')}`);
  });
});

