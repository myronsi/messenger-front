import { RefObject, useEffect, useRef, useState } from 'react';

const STICKY_TOP = 2;
const PUSH_GAP = 8;
const FADE_MS = 300;

interface StickyDateBadgeOptions {
  chatContainerRef: RefObject<HTMLDivElement | null>;
  active: boolean;
  contentKey: unknown;
}

export const useStickyDateBadge = ({ chatContainerRef, active, contentKey }: StickyDateBadgeOptions) => {
  const [label, setLabel] = useState<string | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    let frame = 0;
    let uncoverTimer: ReturnType<typeof setTimeout> | undefined;
    const separators = () => [...container.querySelectorAll<HTMLElement>('.date-separator')];
    const update = () => {
      frame = 0;
      const top = container.getBoundingClientRect().top + STICKY_TOP;
      const height = badgeRef.current?.offsetHeight || 28;
      let current: HTMLElement | null = null;
      let next: HTMLElement | null = null;
      for (const separator of separators()) {
        if (separator.getBoundingClientRect().top <= top + 0.5) current = separator;
        else if (!next) next = separator;
      }
      for (const separator of separators()) separator.toggleAttribute('data-covered', active && separator === current);
      const push = next ? Math.min(0, next.getBoundingClientRect().top - (top + height + PUSH_GAP)) : 0;
      if (badgeRef.current) badgeRef.current.style.transform = push ? `translateY(${push}px)` : '';
      setLabel(current?.dataset.date ?? null);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    if (active) {
      update();
    } else {
      uncoverTimer = setTimeout(() => separators().forEach((separator) => separator.removeAttribute('data-covered')), FADE_MS);
    }
    container.addEventListener('scroll', schedule, { passive: true });
    return () => {
      container.removeEventListener('scroll', schedule);
      if (frame) cancelAnimationFrame(frame);
      if (uncoverTimer) clearTimeout(uncoverTimer);
    };
  }, [chatContainerRef, active, contentKey]);

  return { label, badgeRef };
};
