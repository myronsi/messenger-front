import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { useSettingsLayout } from '../model/settingsLayout';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
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
  const pane = useSettingsLayout() === 'pane';
  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><Globe className="h-4 w-4 text-muted-foreground" />{translations.language || 'Language'}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
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
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/60"
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
