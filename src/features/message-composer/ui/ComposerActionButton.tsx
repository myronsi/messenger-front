import React from 'react';
import { ChevronUp, Lock, Mic, Send, Square, X } from 'lucide-react';
import { LOCK_DISTANCE } from '../model/useHoldToRecord';

type Mode = 'send' | 'voice' | 'recording' | 'cancel';

interface ComposerActionButtonProps {
  mode: Mode;
  disabled: boolean;
  cancelLabel: string;
  editLabel?: string;
  onClick: () => void;
  holding?: boolean;
  lift?: number;
  holdHandlers?: Pick<React.DOMAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>;
}

const LABELS: Record<Exclude<Mode, 'cancel'>, string> = {
  send: 'Send message',
  voice: 'Hold to record a voice message',
  recording: 'Stop recording and listen',
};

const icon = (visible: boolean, from: 'above' | 'below') => `absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
  visible ? 'translate-y-0 scale-100 opacity-100' : `${from === 'above' ? '-translate-y-2' : 'translate-y-2'} scale-75 opacity-0`
}`;

const ComposerActionButton: React.FC<ComposerActionButtonProps> = ({
  mode, disabled, cancelLabel, editLabel, onClick, holding = false, lift = 0, holdHandlers,
}) => {
  const progress = Math.min(1, lift / LOCK_DISTANCE);
  const live = mode === 'recording' && !holding;
  const calm = mode === 'send' || (mode === 'recording' && holding);
  return (
    <div className="relative shrink-0">
      <div
        data-testid="recording-lock"
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-full border border-border/60 bg-background/90 px-2 py-2 text-muted-foreground shadow-lg backdrop-blur transition-opacity duration-150 ${
          holding ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `translate(-50%, ${-progress * 12}px)` }}
      >
        <Lock className={`h-4 w-4 ${progress >= 1 ? 'text-primary' : ''}`} />
        <ChevronUp className="h-4 w-4 motion-presence" />
      </div>
      <button
        type="button"
        {...holdHandlers}
        onPointerDown={(event) => {
          event.preventDefault();
          holdHandlers?.onPointerDown?.(event);
        }}
        onMouseDown={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        aria-label={mode === 'cancel' ? cancelLabel : mode === 'send' && editLabel ? editLabel : LABELS[mode]}
        className={`motion-press relative flex h-14 w-14 touch-none select-none items-center justify-center overflow-hidden rounded-full ${
          holding ? '' : 'transition-[background-color,transform] duration-200'
        } ${
          live ? 'motion-presence bg-destructive text-destructive-foreground hover:bg-destructive/90' : calm ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-accent text-accent-foreground hover:bg-accent/90'
        } disabled:opacity-50`}
        style={{ transform: lift ? `translateY(${-lift}px)` : undefined }}
      >
        <span className={icon(mode === 'send', 'below')}>
          <Send className="h-6 w-6" />
        </span>
        <span className={icon(mode === 'cancel', 'below')}>
          <X className="h-6 w-6" />
        </span>
        <span className={icon(mode === 'voice' || (mode === 'recording' && holding), 'above')}>
          <Mic className="h-6 w-6" />
        </span>
        <span className={icon(live, 'below')}>
          <Square className="h-5 w-5 fill-current" />
        </span>
      </button>
    </div>
  );
};

export default ComposerActionButton;
