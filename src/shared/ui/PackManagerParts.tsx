import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronRight, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface PackRowProps {
  preview: ReactNode[];
  placeholder: ReactNode;
  title: string;
  detail: string;
  badge?: string;
  index: number;
  onOpen: () => void;
}

export const PackRow = ({ preview, placeholder, title, detail, badge, index, onOpen }: PackRowProps) => (
  <li className="motion-pack-row" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
    <button type="button" onClick={onOpen}
      className="motion-press flex w-full items-center gap-3 rounded-2xl border border-border bg-muted/20 p-2 text-left transition-colors hover:bg-accent">
      <span aria-hidden="true" className="flex h-12 w-[8.75rem] shrink-0 items-center gap-1 overflow-hidden rounded-xl bg-muted/60 px-1.5">
        {preview.length > 0
          ? preview.slice(0, 4).map((item, position) => <span key={position} className="flex h-8 w-8 shrink-0 items-center justify-center">{item}</span>)
          : <span className="flex w-full items-center justify-center text-muted-foreground">{placeholder}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{detail}</span>
          {badge && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive">
              <EyeOff className="h-3 w-3" />{badge}
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  </li>
);

interface PackCreateBarProps {
  summary: string;
  newLabel: string;
  titleLabel: string;
  createLabel: string;
  cancelLabel: string;
  busy: boolean;
  alwaysOpen: boolean;
  onCreate: (title: string) => Promise<boolean>;
}

export const PackCreateBar = ({ summary, newLabel, titleLabel, createLabel, cancelLabel, busy, alwaysOpen, onCreate }: PackCreateBarProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const shown = open || alwaysOpen;

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    if (await onCreate(value)) {
      setTitle('');
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{summary}</span>
        {!shown && <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{newLabel}</Button>}
      </div>
      {shown && (
        <form className="motion-pack-panel flex gap-2" onSubmit={(event) => { void submit(event); }}>
          <input ref={input} aria-label={titleLabel} placeholder={titleLabel} maxLength={64} value={title} onChange={(event) => setTitle(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          {open && <Button type="button" variant="ghost" onClick={() => { setOpen(false); setTitle(''); }}>{cancelLabel}</Button>}
          <Button type="submit" disabled={!title.trim() || busy}>{createLabel}</Button>
        </form>
      )}
    </div>
  );
};

export const PackEmpty = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <div className="motion-pack-row flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
    <p className="font-medium">{title}</p>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export const PackFill = ({ label, hint, ratio }: { label: string; hint?: string; ratio: number }) => (
  <div>
    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      {hint && <span className="truncate">{hint}</span>}
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${Math.max(2, Math.min(1, ratio) * 100)}%` }} />
    </div>
  </div>
);
