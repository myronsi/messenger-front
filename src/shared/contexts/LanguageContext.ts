import { createContext, useContext } from 'react';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import { es } from '@/shared/lang/es';
import { de } from '@/shared/lang/de';
import type { AppLanguage } from '@/shared/lang/languages';

export type Translations = typeof en;
export const BUNDLES: Record<AppLanguage, Translations> = { en, ru, es, de };

export interface LanguageContextType {
  language: AppLanguage;
  translations: Translations;
  setLanguage: (lang: AppLanguage) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
