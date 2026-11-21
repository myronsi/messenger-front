import { useEffect, useState } from 'react';
import { ProgressRing } from '@/shared/ui/ProgressRing';

export const UndoToastBody = ({ message, undoLabel, countdownLabel, seconds, endsAt, onUndo }: {
  message: string; undoLabel: string; countdownLabel: string; seconds: number; endsAt: number; onUndo: () => void;
}) => {
  const left = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(left);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(left()), 200);
    return () => window.clearInterval(timer);
  });
  return (
    <div data-testid="undo-toast" className="flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground shadow-lg">
      <ProgressRing progress={remaining / seconds} size={28} stroke={3} label={countdownLabel.replace('{seconds}', String(remaining))}
        className="stroke-destructive">
        <span className="text-xs font-semibold tabular-nums">{remaining}</span>
      </ProgressRing>
      <span className="min-w-0 flex-1 truncate">{message}</span>
      <button type="button" onClick={onUndo}
        className="motion-press shrink-0 rounded-md px-2 py-1 font-semibold text-primary transition-colors hover:bg-accent">
        {undoLabel}
      </button>
    </div>
  );
};
