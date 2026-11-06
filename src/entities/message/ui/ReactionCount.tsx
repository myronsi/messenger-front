import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../model/messageDeletion';

export const ReactionCount = ({ count }: { count: number }) => {
  const shown = useRef(count);
  const [previous, setPrevious] = useState<number | null>(null);

  useEffect(() => {
    if (shown.current === count) return;
    const old = shown.current;
    shown.current = count;
    if (prefersReducedMotion()) return;
    setPrevious(old);
    const timer = window.setTimeout(() => setPrevious(null), 220);
    return () => clearTimeout(timer);
  }, [count]);

  const direction = previous !== null && previous > count ? 'down' : 'up';
  return <span className="relative inline-flex overflow-hidden text-[11px] font-medium tabular-nums" data-testid="reaction-count">
    {previous !== null && <span aria-hidden="true" className={`reaction-count-out-${direction} absolute inset-0`}>{previous}</span>}
    <span key={count} className={previous !== null ? `reaction-count-in-${direction}` : undefined}>{count}</span>
  </span>;
};
