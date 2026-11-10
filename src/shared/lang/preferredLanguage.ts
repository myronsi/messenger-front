import { APP_LANGUAGES, isAppLanguage, type AppLanguage } from './languages';

export const LANGUAGE_STORAGE_KEY = 'language';

export const matchAppLanguage = (tags: readonly string[]): AppLanguage | undefined => {
  for (const tag of tags) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    const match = APP_LANGUAGES.find((language) => language === primary);
    if (match) return match;
  }
  return undefined;
};

const browserLanguageTags = (): readonly string[] => {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
};

export const savedLanguage = (): AppLanguage | undefined => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
};

export const preferredLanguage = (): AppLanguage => savedLanguage() ?? matchAppLanguage(browserLanguageTags()) ?? 'en';

export const saveLanguage = (language: AppLanguage) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
};
