import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  visible: boolean;
  count: number;
  label: string;
  countLabel: string;
  onClick: () => void;
}

const MAX_BADGE = 99;

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ visible, count, label, countLabel, onClick }) => {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timeout = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timeout);
  }, [visible]);

  const ariaLabel = count > 0 ? countLabel : label;

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">{visible && count > 0 ? countLabel : ''}</span>
      {mounted && (
        <button
          type="button"
          aria-label={ariaLabel}
          title={ariaLabel}
          onClick={onClick}
          className={`motion-move-down relative flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-lg shadow-foreground/15 backdrop-blur-xl transition-colors hover:bg-background ${shown ? 'is-visible' : ''}`}
        >
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
          {count > 0 && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] rounded-full bg-primary px-1 text-center text-xs font-semibold leading-5 text-primary-foreground ring-2 ring-background">
              {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
            </span>
          )}
        </button>
      )}
    </>
  );
};

export default ScrollToBottomButton;
