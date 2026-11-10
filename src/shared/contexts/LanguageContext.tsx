import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import { es } from '@/shared/lang/es';
import { de } from '@/shared/lang/de';
import type { AppLanguage } from '@/shared/lang/languages';
import { preferredLanguage, saveLanguage } from '@/shared/lang/preferredLanguage';
import { syncNotificationWorkerLanguage } from '@/shared/lib/notifications/workerSettings';

type Language = AppLanguage;
export type Translations = typeof en;
const BUNDLES: Record<AppLanguage, Translations> = { en, ru, es, de };

interface LanguageContextType {
  language: Language;
  translations: Translations;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<Language>(preferredLanguage);
  const translations = BUNDLES[language];

  const setLanguage = useCallback((next: Language) => {
    saveLanguage(next);
    setCurrentLanguage(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    syncNotificationWorkerLanguage(language);
  }, [language]);

  const value = useMemo(() => ({ language, translations, setLanguage }), [language, translations, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
