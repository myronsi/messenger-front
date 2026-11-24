import type { en } from './en';
import type { AppLanguage } from './languages';

export type Translations = typeof en;

const loaders: Record<AppLanguage, () => Promise<Translations>> = {
  en: () => import('./en').then((bundle) => bundle.en),
  ru: () => import('./ru').then((bundle) => bundle.ru),
  es: () => import('./es').then((bundle) => bundle.es),
  de: () => import('./de').then((bundle) => bundle.de),
};

const loaded = new Map<AppLanguage, Translations>();

export const hasTranslations = (language: AppLanguage) => loaded.has(language);

export const loadTranslations = async (language: AppLanguage) => {
  const cached = loaded.get(language);
  if (cached) return cached;
  const bundle = await loaders[language]();
  loaded.set(language, bundle);
  return bundle;
};

export const loadedTranslations = (language: AppLanguage) => {
  const bundle = loaded.get(language);
  if (!bundle) throw new Error(`translations for ${language} are not loaded`);
  return bundle;
};
