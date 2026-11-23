import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppLanguage } from '@/shared/lang/languages';
import { preferredLanguage, saveLanguage } from '@/shared/lang/preferredLanguage';
import { syncNotificationWorkerLanguage } from '@/shared/lib/notifications/workerSettings';
import { BUNDLES, LanguageContext } from './LanguageContext';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setCurrentLanguage] = useState<AppLanguage>(preferredLanguage);
  const translations = BUNDLES[language];

  const setLanguage = useCallback((next: AppLanguage) => {
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
