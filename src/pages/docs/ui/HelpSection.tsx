import type { Translations } from '@/shared/contexts/LanguageContext';
import { getDocsIcon } from '../model/docsIcons';
import IconTile from './IconTile';

type HelpSectionData = Translations['docs']['sections'][number];

const HelpSection = ({ section }: { section: HelpSectionData }) => (
  <section id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-4 overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <IconTile icon={getDocsIcon(section.id)} />
      <h2 id={`${section.id}-title`} className="min-w-0 flex-1 text-sm font-semibold text-foreground">{section.title}</h2>
    </div>
    <ol className="divide-y divide-border">
      {section.steps.map((step, index) => (
        <li key={step} className="flex gap-3 px-4 py-3">
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 text-sm leading-6 text-subtle-foreground">{step}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default HelpSection;
