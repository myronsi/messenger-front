import type { ReactNode } from 'react';

interface DocsCardProps {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

// Same card as the profile settings sections: uppercase caption header, divided rows.
const DocsCard = ({ id, title, description, children }: DocsCardProps) => (
  <section id={id} aria-label={title} className="scroll-mt-4 overflow-hidden rounded-lg border border-border bg-card">
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);

export default DocsCard;
