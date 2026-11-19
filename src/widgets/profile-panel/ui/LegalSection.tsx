import React from 'react';
import { ExternalLink, FileText, Gavel, Landmark, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { LEGAL_PAGES, type LegalPage } from '@/shared/lib/helpSite';
import { HelpSiteLink } from '@/shared/ui/HelpSiteLink';

const ICONS: Record<LegalPage, LucideIcon> = { privacy: ShieldCheck, terms: FileText, guidelines: Gavel, imprint: Landmark };

const LegalSection: React.FC = () => {
  const t = useLanguage().translations.legal;
  return (
    <section aria-labelledby="settings-legal-title" className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 id="settings-legal-title" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.title}</h3>
      </div>
      {LEGAL_PAGES.map((page, index) => {
        const Icon = ICONS[page];
        return (
          <HelpSiteLink key={page} page={page}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-accent/60 ${index > 0 ? 'border-t border-border' : ''}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-subtle-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t.documents[page]}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </HelpSiteLink>
        );
      })}
    </section>
  );
};

export default LegalSection;
