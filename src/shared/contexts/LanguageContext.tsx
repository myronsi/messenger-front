import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';
import { es } from '@/shared/lang/es';
import { de } from '@/shared/lang/de';
import { isAppLanguage, type AppLanguage } from '@/shared/lang/languages';
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
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return isAppLanguage(saved) ? saved : 'ru';
  });

  const [translations, setTranslations] = useState<Translations>(BUNDLES[language]);

  useEffect(() => {
    localStorage.setItem('language', language);
    setTranslations(BUNDLES[language]);
    syncNotificationWorkerLanguage(language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, translations, setLanguage }}>
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
