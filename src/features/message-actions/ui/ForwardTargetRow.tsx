import type React from 'react';
import { Check, Users } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { useLongPress } from '@/shared/lib/useLongPress';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { cn } from '@/shared/lib/utils';
import type { ForwardTarget } from '../model/useForwardTargets';

interface ForwardTargetRowProps {
  target: ForwardTarget;
  preview: string;
  time: string;
  groupLabel: string;
  chooseLabel: string;
  selected: boolean;
  selecting: boolean;
  highlighted: boolean;
  disabled: boolean;
  onActivate: (target: ForwardTarget, event: React.MouseEvent) => void;
  onToggle: (target: ForwardTarget) => void;
  enterDelayMs?: number;
}

export const ForwardTargetRow = ({
  target, preview, time, groupLabel, chooseLabel, selected, selecting, highlighted, disabled, onActivate, onToggle, enterDelayMs = 0,
}: ForwardTargetRowProps) => {
  const longPress = useLongPress(disabled ? undefined : () => onToggle(target), { mouse: true });
  return (
    <div role="option" tabIndex={-1} aria-selected={selected} aria-disabled={disabled || undefined} data-testid="forward-target"
      onClick={(event) => { if (!longPress.consumeClick() && !disabled) onActivate(target, event); }}
      {...longPress.handlers}
      {...longPress.mouseHandlers}
      style={{ animationDelay: `${enterDelayMs}ms` }}
      className={cn('group motion-press motion-forward-row relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 touch-pan-y',
        highlighted || selected ? 'bg-accent' : 'hover:bg-accent/60', disabled && 'cursor-default opacity-50')}>
      <div className="relative shrink-0">
        <AuthenticatedImage src={target.avatarUrl} alt={plainEmoji(target.name)} className="h-12 w-12 rounded-full object-cover" />
        <button type="button" role="checkbox" aria-checked={selected} aria-label={chooseLabel} disabled={disabled}
          onClick={(event) => { event.stopPropagation(); onToggle(target); }}
          className={cn('absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background transition-opacity',
            selected ? 'bg-primary text-primary-foreground opacity-100' : 'bg-muted-foreground/40 text-transparent',
            !selected && (selecting ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100'))}>
          <Check key={selected ? 'on' : 'off'} className={cn('h-3 w-3', selected && 'motion-selection-check')} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] font-medium leading-5">
            {target.type === 'group' && <Users aria-label={groupLabel} className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="truncate"><EmojiText text={target.name} /></span>
          </div>
          {time && <span className="shrink-0 text-xs text-muted-foreground">{time}</span>}
        </div>
        <div className="mt-0.5 truncate text-sm leading-5 text-muted-foreground"><EmojiText text={preview} /></div>
      </div>
    </div>
  );
};
