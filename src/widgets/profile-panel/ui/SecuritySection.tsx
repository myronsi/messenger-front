import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export const securityButton = 'h-11 shrink-0 border-input px-3.5 text-[13px]';
export const securityLabel = 'text-[13px] font-medium text-foreground';
export const securityInput = 'h-11 border-input';

export const SecuritySection = ({ id, title, description, action, children }: {
  id: string; title: string; description?: string; action?: ReactNode; children: ReactNode;
}) => <section aria-labelledby={`${id}-title`} className="scroll-mt-4">
  <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1">
    <div className="min-w-0 flex-1 basis-48">
      <h3 id={`${id}-title`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{children}</div>
</section>;

export const SecurityRow = ({ id, title, badge, description, action, children, region }: {
  id?: string; title: string; badge?: ReactNode; description?: ReactNode; action?: ReactNode; children?: ReactNode; region?: boolean;
}) => <div id={id} role={region ? 'region' : undefined} aria-label={region ? title : undefined} className="flex scroll-mt-4 flex-col gap-3 px-4 py-3">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0 flex-1 basis-48">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">{title}{badge}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
    {action}
  </div>
  {children}
</div>;

export const SecurityNavRow = ({ label, summary, onClick }: { label: string; summary?: ReactNode; onClick: () => void }) => <button type="button"
  onClick={onClick} className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50">
  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{label}</span>
  {summary && <span className="max-w-[40%] truncate text-sm text-muted-foreground">{summary}</span>}
  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
</button>;
