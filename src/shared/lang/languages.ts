export const APP_LANGUAGES = ['en', 'ru', 'es'] as const;
export type AppLanguage = typeof APP_LANGUAGES[number];

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
};

const LOCALES: Record<AppLanguage, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
  es: 'es-ES',
};

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);

export function localeOf(language: string): string;
export function localeOf(language: string, english: string | undefined): string | undefined;
export function localeOf(language: string, ...english: [string | undefined] | []) {
  if (isAppLanguage(language) && language !== 'en') return LOCALES[language];
  return english.length ? english[0] : LOCALES.en;
}
