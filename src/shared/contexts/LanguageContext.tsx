import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/shared/lang/en';
import { ru } from '@/shared/lang/ru';

type Language = 'en' | 'ru';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  translations: Translations;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ru';
  });

  const [translations, setTranslations] = useState<Translations>(language === 'ru' ? ru : en);

  useEffect(() => {
    localStorage.setItem('language', language);
    setTranslations(language === 'ru' ? ru : en);
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

function validateTranslations(base: Record<string, string>, compare: Record<string, string>) {
  const missing = Object.keys(base).filter(key => !(key in compare));
  if (missing.length > 0) {
    console.warn("Missing translation keys:", missing);
  }
}