import React from 'react';
import { Check, Globe } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { LANGUAGE_NAMES, type AppLanguage } from '../languageNames';

interface LanguageSettingsPageProps {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
  onBack: () => void;
}

const LanguageSettingsPage: React.FC<LanguageSettingsPageProps> = ({ language, onChange, onBack }) => {
  const { translations } = useLanguage();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={onBack}>{translations.profile || 'Profile'}</button>
          <span>/</span>
          <button type="button" onClick={onBack}>{translations.settings || 'Settings'}</button>
          <span>/</span>
          <span className="inline-flex items-center gap-2 font-medium"><Globe className="h-4 w-4 text-muted-foreground" />{translations.language || 'Language'}</span>
        </nav>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{translations.languageDescription}</p>
        <div role="radiogroup" aria-label={translations.language || 'Language'} className="overflow-hidden rounded-lg border border-border">
          {(Object.keys(LANGUAGE_NAMES) as AppLanguage[]).map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={language === code}
              onClick={() => { if (language !== code) onChange(code); }}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-gray-50"
            >
              <span className="min-w-0 flex-1 font-medium text-foreground">{LANGUAGE_NAMES[code]}</span>
              {language === code && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSettingsPage;
