import React from 'react';
import { Info } from 'lucide-react';
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
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{translations.about || 'About'}</p>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
          <Info className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-900" data-testid="about-versions">{summary}</span>
          <span className="block truncate text-xs text-gray-500">
            {translations.build || 'Build'} {APP_COMMIT}
            {data?.commit ? ` · ${translations.serverVersion || 'Server'} ${data.commit}` : ''}
          </span>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
