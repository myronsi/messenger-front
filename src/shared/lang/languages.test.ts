import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';
import { isAppLanguage, localeOf } from './languages';

const keysOf = (value: unknown, prefix = ''): string[] => (value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key))
  : [prefix]);

const placeholders = (text: unknown) => (typeof text === 'string' ? (text.match(/\{\w+\}/g) ?? []).sort() : []);
const valueAt = (bundle: unknown, path: string) => path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], bundle);

describe('localeOf', () => {
  it('maps app languages to date locales', () => {
    expect(localeOf('ru')).toBe('ru-RU');
    expect(localeOf('es')).toBe('es-ES');
    expect(localeOf('en')).toBe('en-GB');
    expect(localeOf('en', 'en-US')).toBe('en-US');
  });

  it('keeps an explicit undefined for English so the browser default applies', () => {
    expect(localeOf('en', undefined)).toBeUndefined();
    expect(localeOf('es', undefined)).toBe('es-ES');
  });

  it('treats unknown languages as English', () => {
    expect(isAppLanguage('de')).toBe(false);
    expect(localeOf('de')).toBe('en-GB');
  });
});

describe('translation bundles', () => {
  const english = keysOf(en);

  it.each([['ru', ru], ['es', es]] as const)('%s has every English key', (_, bundle) => {
    expect(keysOf(bundle).sort()).toEqual([...english].sort());
  });

  it.each([['ru', ru], ['es', es]] as const)('%s keeps the placeholders of every English string', (_, bundle) => {
    const mismatched = english.filter((key) => placeholders(valueAt(en, key)).join() !== placeholders(valueAt(bundle, key)).join());
    expect(mismatched).toEqual([]);
  });
});
