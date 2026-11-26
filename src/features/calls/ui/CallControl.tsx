import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type Tone = 'default' | 'active' | 'danger' | 'primary';

interface CallControlProps {
  icon: LucideIcon;
  label: string;
  ariaLabel?: string;
  tone?: Tone;
  pressed?: boolean;
  hasPopup?: boolean;
  onClick: () => void;
}

const tones: Record<Tone, string> = {
  default: 'bg-muted text-foreground group-hover:bg-accent',
  active: 'bg-foreground text-background',
  danger: 'bg-destructive text-destructive-foreground group-hover:bg-destructive/90',
  primary: 'bg-primary text-primary-foreground group-hover:bg-primary/90',
};

const CallControl: React.FC<CallControlProps> = ({ icon: Icon, label, ariaLabel, tone = 'default', pressed, hasPopup, onClick }) => (
  <button type="button" aria-label={ariaLabel} title={ariaLabel ?? label} aria-pressed={pressed} aria-haspopup={hasPopup ? 'dialog' : undefined}
    onClick={onClick}
    className="group flex w-16 shrink-0 flex-col items-center gap-2 rounded-2xl sm:w-[4.5rem] text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className={cn('flex h-14 w-14 items-center justify-center rounded-full transition-colors sm:h-16 sm:w-16', tones[tone])}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <span aria-hidden={ariaLabel ? true : undefined} className="max-w-full truncate">{label}</span>
  </button>
);

export default CallControl;
