import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { EmojiText } from '@/shared/ui/CustomEmoji';

const SPEED_PX_PER_SECOND = 30;
const MIN_SECONDS = 4;

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const outer = box.current;
    const content = inner.current;
    if (!outer || !content) return undefined;
    const measure = () => setDistance(Math.max(0, Math.ceil(outer.scrollWidth - outer.clientWidth)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  const sliding = distance > 0 && !prefersReducedMotion();
  const style = sliding ? {
    '--marquee-distance': `-${distance}px`,
    '--marquee-duration': `${Math.max(MIN_SECONDS, (distance / SPEED_PX_PER_SECOND) * 2.5)}s`,
  } as CSSProperties : undefined;

  return (
    <span ref={box} data-testid="marquee" data-sliding={sliding || undefined}
      className={cn('block overflow-hidden whitespace-nowrap', sliding ? 'motion-marquee-mask' : 'text-ellipsis', className)}>
      <span ref={inner} className={cn(sliding && 'inline-block motion-marquee')} style={style}>
        <EmojiText text={text} />
      </span>
    </span>
  );
};
