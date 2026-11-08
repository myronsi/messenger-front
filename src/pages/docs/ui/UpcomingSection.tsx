import type { Translations } from '@/shared/contexts/LanguageContext';
import { getDocsIcon } from '../model/docsIcons';
import DocsCard from './DocsCard';
import IconTile from './IconTile';

interface UpcomingSectionProps {
  docs: Translations['docs'];
  comingSoon: string;
}

const UpcomingSection = ({ docs, comingSoon }: UpcomingSectionProps) => (
  <DocsCard id="upcoming" title={docs.upcomingTitle} description={docs.upcomingIntro}>
    <ul className="divide-y divide-border">
      {docs.upcoming.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <IconTile icon={getDocsIcon(item.id)} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{item.title}</span>
            <span className="block text-xs text-muted-foreground">{item.description}</span>
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-subtle-foreground">{comingSoon}</span>
        </li>
      ))}
    </ul>
  </DocsCard>
);

export default UpcomingSection;
