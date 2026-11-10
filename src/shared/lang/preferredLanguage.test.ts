import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { matchAppLanguage, preferredLanguage, saveLanguage } from './preferredLanguage';

const stubLanguages = (languages: string[]) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? '');
};

describe('matchAppLanguage', () => {
  it('matches by primary subtag in browser order', () => {
    expect(matchAppLanguage(['es-MX', 'en-US'])).toBe('es');
    expect(matchAppLanguage(['RU_ru'])).toBe('ru');
  });

  it('skips unsupported languages and returns undefined when none match', () => {
    expect(matchAppLanguage(['xx-XX', 'en-GB'])).toBe('en');
    expect(matchAppLanguage(['xx', 'yy-ZZ'])).toBeUndefined();
    expect(matchAppLanguage([])).toBeUndefined();
  });
});

describe('preferredLanguage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('prefers the saved choice over the browser language', () => {
    stubLanguages(['es-ES']);
    localStorage.setItem('language', 'ru');
    expect(preferredLanguage()).toBe('ru');
  });

  it('uses the first supported browser language when nothing is saved', () => {
    stubLanguages(['xx-XX', 'es-AR', 'ru-RU']);
    expect(preferredLanguage()).toBe('es');
  });

  it('ignores an invalid saved value and falls back to English', () => {
    stubLanguages(['xx-XX']);
    localStorage.setItem('language', 'klingon');
    expect(preferredLanguage()).toBe('en');
  });

  it('saves the chosen language', () => {
    expect(saveLanguage('es')).toBe(true);
    expect(localStorage.getItem('language')).toBe('es');
  });
});
