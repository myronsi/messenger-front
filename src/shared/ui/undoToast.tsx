import { toast } from '@/shared/ui/sonner';
import { UndoToastBody } from '@/shared/ui/UndoToastBody';

export const UNDO_SECONDS = 5;

interface UndoToastOptions {
  message: string;
  undoLabel: string;
  countdownLabel: string;
  seconds?: number;
  onUndo: () => void;
  onExpire: () => void;
}

export const showUndoToast = ({ message, undoLabel, countdownLabel, seconds = UNDO_SECONDS, onUndo, onExpire }: UndoToastOptions) => {
  const endsAt = Date.now() + seconds * 1000;
  let settled = false;
  let id: string | number = '';
  const settle = (run: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    window.removeEventListener('pagehide', flush);
    toast.dismiss(id);
    run();
  };
  const flush = () => settle(onExpire);
  const timer = window.setTimeout(flush, seconds * 1000);
  window.addEventListener('pagehide', flush);
  id = toast.custom(() => (
    <UndoToastBody message={message} undoLabel={undoLabel} countdownLabel={countdownLabel} seconds={seconds} endsAt={endsAt}
      onUndo={() => settle(onUndo)} />
  ), { duration: seconds * 1000 + 500 });
  return { undo: () => settle(onUndo), commit: flush };
};
