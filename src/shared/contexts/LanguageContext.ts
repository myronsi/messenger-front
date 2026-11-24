import { createContext, useContext } from 'react';
import type { AppLanguage } from '@/shared/lang/languages';
import type { Translations } from '@/shared/lang/translations';

export type { Translations };

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
