import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';

export interface PinChoice {
  key: string;
  label: string;
  strong?: boolean;
  onSelect: () => void;
}

interface PinChoiceDialogProps {
  icon: ReactNode;
  title: string;
  choices: PinChoice[];
  onCancel: () => void;
}

export const PinChoiceDialog = ({ icon, title, choices, onCancel }: PinChoiceDialogProps) => {
  const t = useLanguage().translations.messagePins;
  return createPortal(
    <ModalSurface label={title}
      className="fixed inset-0 z-[11002] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onCancel(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <div data-testid="pin-choice-dialog" className="motion-panel-in w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div aria-hidden="true" className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
        <h3 className="mb-4 text-lg font-semibold leading-snug tracking-tight">{title}</h3>
        <div className="flex flex-col gap-2">
          {choices.map((choice) => (
            <button key={choice.key} type="button" onClick={choice.onSelect}
              className={cn('motion-press w-full rounded-md px-4 py-2 text-left transition-colors',
                choice.strong ? 'bg-primary font-medium text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90')}>
              {choice.label}
            </button>
          ))}
          <button type="button" onClick={onCancel} className="motion-press w-full rounded-md px-4 py-2 text-left text-muted-foreground transition-colors hover:bg-accent">
            {t.cancel}
          </button>
        </div>
      </div>
    </ModalSurface>,
    document.body,
  );
};
