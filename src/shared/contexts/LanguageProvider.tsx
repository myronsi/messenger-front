import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppLanguage } from '@/shared/lang/languages';
import { preferredLanguage, saveLanguage } from '@/shared/lang/preferredLanguage';
import { hasTranslations, loadTranslations, loadedTranslations } from '@/shared/lang/translations';
import { syncNotificationWorkerLanguage } from '@/shared/lib/notifications/workerSettings';
import { LanguageContext } from './LanguageContext';

const initialLanguage = (): AppLanguage => {
  const preferred = preferredLanguage();
  return hasTranslations(preferred) ? preferred : 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<AppLanguage>(initialLanguage);
  const translations = loadedTranslations(language);

  const setLanguage = useCallback((next: AppLanguage) => {
    saveLanguage(next);
    if (hasTranslations(next)) {
      setCurrentLanguage(next);
      return;
    }
    void loadTranslations(next).then(() => setCurrentLanguage(next), () => undefined);
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
