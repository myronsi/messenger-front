import React from 'react';
import { BookOpen, ExternalLink, LifeBuoy } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { HelpSiteLink } from '@/shared/ui/HelpSiteLink';
import LegalSection from './LegalSection';
import { useSettingsLayout } from '../model/settingsLayout';

const HelpPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { translations } = useLanguage();
  const pane = useSettingsLayout() === 'pane';
  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />{translations.legal.help}
            </BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <HelpSiteLink className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-subtle-foreground">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{translations.appShell.aboutInfo.helpCenter}</span>
              <span className="block truncate text-xs text-muted-foreground">{translations.appShell.aboutInfo.helpCenterHint}</span>
            </span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </HelpSiteLink>
        </section>
        <LegalSection />
      </div>
    </div>
  );
};

export default HelpPage;
