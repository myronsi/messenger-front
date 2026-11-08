import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const VISIBLE_MS = 3000;
const EXIT_MS = 220;

interface ComposerNoticeProps {
  message: string;
  closeLabel: string;
  onDismiss: () => void;
}

const ComposerNotice: React.FC<ComposerNoticeProps> = ({ message, closeLabel, onDismiss }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLeaving(true), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(onDismiss, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDismiss]);

  return (
    <div role="status" className={`${leaving ? 'motion-collapse-out' : 'motion-collapse-in'} -mb-2 grid`}>
      <div className="min-h-0 overflow-hidden">
        <div className="pb-2">
          <div className="flex items-start gap-2 rounded-2xl bg-destructive/15 py-2 pl-3 pr-2 text-sm text-destructive shadow-sm">
            <span className="min-w-0 flex-1">{message}</span>
            <button
              type="button"
              aria-label={closeLabel}
              onPointerDown={(event) => event.preventDefault()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setLeaving(true)}
              className="motion-press shrink-0 rounded-full p-0.5 text-destructive transition-colors hover:bg-destructive/25 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposerNotice;
