import React from 'react';
import { DocsLink } from '@/shared/ui/DocsLink';
import { BookOpen, ChevronRight, Info } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useGetServerVersionQuery } from '@/shared/api/versionApi';
import { APP_COMMIT, APP_VERSION } from '@/shared/lib/appVersion';

const AboutSection: React.FC = () => {
  const { translations } = useLanguage();
  const { data, isLoading } = useGetServerVersionQuery();
  const unknown = isLoading ? '…' : '—';
  const summary = [
    `${translations.appVersion || 'App'} ${APP_VERSION}`,
    `${translations.serverVersion || 'Server'} ${data?.serverVersion ?? unknown}`,
    `${translations.apiVersion || 'API'} ${data?.apiVersion ?? unknown}`,
  ].join(' · ');

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.about || 'About'}</p>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-subtle-foreground">
          <Info className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground" data-testid="about-versions">{summary}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {translations.build || 'Build'} {APP_COMMIT}
            {data?.commit ? ` · ${translations.serverVersion || 'Server'} ${data.commit}` : ''}
          </span>
        </div>
      </div>
      <DocsLink className="flex items-center gap-3 border-t border-border px-4 py-3 hover:bg-accent/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-subtle-foreground">
          <BookOpen className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{translations.docsLink}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </DocsLink>
    </section>
  );
};

export default AboutSection;
