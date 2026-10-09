import { ChevronRight, History, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { getDocsIcon } from '../model/docsIcons';
import DocsCard from './DocsCard';
import IconTile from './IconTile';

interface ContentsRow {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const DocsContents = ({ docs }: { docs: Translations['docs'] }) => {
  const rows: ContentsRow[] = [
    ...docs.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: docs.stepsCount.replace('{count}', String(section.steps.length)),
      icon: getDocsIcon(section.id),
    })),
    { id: 'whats-new', title: docs.whatsNewTitle, description: docs.whatsNewIntro, icon: History },
    { id: 'upcoming', title: docs.upcomingTitle, description: docs.upcomingIntro, icon: Sparkles },
  ];

  return (
    <nav aria-label={docs.contents}>
      <DocsCard title={docs.contents}>
        {rows.map((row) => (
          <a
            key={row.id}
            href={`#${row.id}`}
            className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50"
          >
            <IconTile icon={row.icon} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-800">{row.title}</span>
              <span className="block truncate text-xs text-gray-500">{row.description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          </a>
        ))}
      </DocsCard>
    </nav>
  );
};

export default DocsContents;
