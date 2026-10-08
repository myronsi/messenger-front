import type { ReactNode } from 'react';

interface DocsCardProps {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

// Same card as the profile settings sections: uppercase caption header, divided rows.
const DocsCard = ({ id, title, description, children }: DocsCardProps) => (
  <section id={id} aria-label={title} className="scroll-mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div className="border-b border-gray-200 px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
    {children}
  </section>
);

export default DocsCard;
