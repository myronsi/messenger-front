import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';

export type ActionDialogTone = 'destructive' | 'primary';

export interface ActionDialogOption {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: ActionDialogTone;
}

interface ActionDialogProps {
  icon: ReactNode;
  title: string;
  points?: string[];
  option?: ActionDialogOption;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: ActionDialogTone;
  busy?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  children?: ReactNode;
  contained?: boolean;
  overlayClassName?: string;
}

export const ActionOption = ({ label, hint, checked, onChange, tone = 'destructive' }: ActionDialogOption) => {
  const id = useId();
  return (
    <label htmlFor={id} data-testid="action-dialog-option"
      className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} aria-label={label}
        aria-describedby={hint ? `${id}-hint` : undefined} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" className={cn(
        'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
        !checked ? 'border-muted-foreground/50'
          : tone === 'primary' ? 'border-primary bg-primary text-primary-foreground' : 'border-destructive bg-destructive text-destructive-foreground',
      )}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span aria-hidden="true" className="block font-medium">{label}</span>
        {hint && <span id={`${id}-hint`} className="block text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
};

export const ActionDialog = ({
  icon, title, points, option, confirmText, cancelText, onConfirm, onCancel, tone = 'destructive', busy = false, confirmDisabled = false,
  error, children, contained = false, overlayClassName,
}: ActionDialogProps) => {
  const { translations } = useLanguage();
  const primary = tone === 'primary';
  const surface = (
    <ModalSurface label={title} onDismiss={() => { if (!busy) onCancel(); }}
      className={cn(`${contained ? 'absolute' : 'fixed'} inset-0 z-[11002] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm`, overlayClassName)}
      onClick={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <form data-testid="action-dialog"
        className="motion-panel-in max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lg"
        onSubmit={(event) => { event.preventDefault(); if (!busy && !confirmDisabled) onConfirm(); }}>
        <div aria-hidden="true" className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5',
          primary ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
          {icon}
        </div>
        <h3 className="mb-3 text-lg font-semibold leading-snug tracking-tight">{title}</h3>
        {!!points?.length && (
          <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
            {points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
        {option && <ActionOption tone={tone} {...option} />}
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="motion-press rounded-md bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/90">
            {cancelText || translations.cancel}
          </button>
          <button type="submit" disabled={busy || confirmDisabled}
            className={cn('motion-press rounded-md px-4 py-2 font-medium transition-colors disabled:opacity-50',
              primary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}>
            {confirmText}
          </button>
        </div>
      </form>
    </ModalSurface>
  );
  return contained ? surface : createPortal(surface, document.body);
};
