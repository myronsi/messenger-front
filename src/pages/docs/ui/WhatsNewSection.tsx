import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ChangeKind, ChangelogRelease } from '../model/parseChangelog';
import DocsCard from './DocsCard';

const KIND_ORDER: ChangeKind[] = ['features', 'fixes', 'performance'];

const KIND_STYLES: Record<ChangeKind, string> = {
  features: 'bg-primary text-primary-foreground',
  fixes: 'bg-gray-100 text-gray-700',
  performance: 'bg-blue-50 text-blue-700',
};

const formatReleaseDate = (date: string, language: 'en' | 'ru') => new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`));

interface WhatsNewSectionProps {
  docs: Translations['docs'];
  releases: ChangelogRelease[];
  language: 'en' | 'ru';
}

const WhatsNewSection = ({ docs, releases, language }: WhatsNewSectionProps) => (
  <DocsCard id="whats-new" title={docs.whatsNewTitle} description={docs.whatsNewIntro}>
    <div className="divide-y divide-gray-200">
      {releases.map((release) => (
        <article key={release.version} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{docs.version.replace('{version}', release.version)}</h3>
            {release.date && <span className="shrink-0 text-xs text-gray-500">{formatReleaseDate(release.date, language)}</span>}
          </div>
          <ul className="mt-2 space-y-2">
            {KIND_ORDER.flatMap((kind) => release.changes[kind].map((entry) => (
              <li key={`${kind}-${entry}`} className="flex items-start gap-2 text-sm leading-6 text-gray-700">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ${KIND_STYLES[kind]}`}>
                  {docs.changeKinds[kind]}
                </span>
                <span className="min-w-0 flex-1">{entry}</span>
              </li>
            )))}
          </ul>
        </article>
      ))}
    </div>
  </DocsCard>
);

export default WhatsNewSection;
