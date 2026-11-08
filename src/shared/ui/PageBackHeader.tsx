import React, { forwardRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface PageBackHeaderProps {
  onBack: () => void;
  children: React.ReactNode;
  hideBack?: boolean;
}

export const PageBackHeader = forwardRef<HTMLButtonElement, PageBackHeaderProps>(({ onBack, children, hideBack = false }, ref) => {
  const { translations } = useLanguage();
  const label = translations.back || 'Back';
  return (
    <div className={`flex min-h-[57px] shrink-0 items-center gap-1 border-b border-border py-2 pr-5 ${hideBack ? 'pl-5' : 'pl-2'}`}>
      {!hideBack && <button ref={ref} type="button" onClick={onBack} aria-label={label} title={label}
        className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
});
PageBackHeader.displayName = 'PageBackHeader';
