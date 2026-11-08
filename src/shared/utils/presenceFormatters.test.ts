import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { es } from '@/shared/lang/es';
import { ru } from '@/shared/lang/ru';
import { getPresenceLabel } from './presenceFormatters';

const now = Date.parse('2026-11-08T12:00:00Z');
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();

describe('getPresenceLabel', () => {
  it('shows online and offline in each language', () => {
    expect(getPresenceLabel(true, null, en.presence, 'en', now)).toBe('online');
    expect(getPresenceLabel(true, null, ru.presence, 'ru', now)).toBe('в сети');
    expect(getPresenceLabel(true, null, es.presence, 'es', now)).toBe('en línea');
    expect(getPresenceLabel(false, null, es.presence, 'es', now)).toBe('desconectado');
    expect(getPresenceLabel(false, 'not a date', en.presence, 'en', now)).toBe('offline');
  });

  it('uses English singular and plural', () => {
    expect(getPresenceLabel(false, ago(0), en.presence, 'en', now)).toBe('last seen just now');
    expect(getPresenceLabel(false, ago(1), en.presence, 'en', now)).toBe('last seen 1 minute ago');
    expect(getPresenceLabel(false, ago(5), en.presence, 'en', now)).toBe('last seen 5 minutes ago');
    expect(getPresenceLabel(false, ago(60), en.presence, 'en', now)).toBe('last seen 1 hour ago');
    expect(getPresenceLabel(false, ago(60 * 24), en.presence, 'en', now)).toBe('last seen yesterday');
    expect(getPresenceLabel(false, ago(60 * 24 * 3), en.presence, 'en', now)).toBe('last seen 3 days ago');
  });

  it('uses all three Russian plural forms', () => {
    expect(getPresenceLabel(false, ago(1), ru.presence, 'ru', now)).toBe('был(а) 1 минуту назад');
    expect(getPresenceLabel(false, ago(3), ru.presence, 'ru', now)).toBe('был(а) 3 минуты назад');
    expect(getPresenceLabel(false, ago(5), ru.presence, 'ru', now)).toBe('был(а) 5 минут назад');
    expect(getPresenceLabel(false, ago(21), ru.presence, 'ru', now)).toBe('был(а) 21 минуту назад');
    expect(getPresenceLabel(false, ago(60 * 2), ru.presence, 'ru', now)).toBe('был(а) 2 часа назад');
    expect(getPresenceLabel(false, ago(60 * 24 * 5), ru.presence, 'ru', now)).toBe('был(а) 5 дней назад');
  });

  it('uses Spanish texts and a Spanish date for older visits', () => {
    expect(getPresenceLabel(false, ago(1), es.presence, 'es', now)).toBe('visto hace 1 minuto');
    expect(getPresenceLabel(false, ago(10), es.presence, 'es', now)).toBe('visto hace 10 minutos');
    expect(getPresenceLabel(false, ago(60 * 24), es.presence, 'es', now)).toBe('visto ayer');
    const older = getPresenceLabel(false, ago(60 * 24 * 10), es.presence, 'es', now);
    expect(older).toBe(`visto el ${new Date(now - 60 * 24 * 10 * 60000).toLocaleDateString('es-ES')}`);
  });
});
