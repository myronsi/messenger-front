import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  count: number;
  label: string;
  onClick: () => void;
}

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ count, label, onClick }) => {
  const visible = count > 0;
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [lastCount, setLastCount] = useState(count);

  useEffect(() => {
    if (visible) {
      setLastCount(count);
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timeout = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timeout);
  }, [visible, count]);

  if (!mounted) return null;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`motion-move-down absolute bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:bottom-28 md:right-[17%] ${shown ? 'is-visible' : ''}`}
    >
      <ChevronDown className="h-5 w-5" />
      <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] rounded-full bg-accent px-1 text-center text-xs text-accent-foreground">
        {lastCount}
      </span>
    </button>
  );
};

export default ScrollToBottomButton;
