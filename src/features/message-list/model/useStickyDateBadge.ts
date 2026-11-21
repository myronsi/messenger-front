import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

const STICKY_TOP = 2;
const PUSH_GAP = 8;
const FADE_MS = 300;

interface PendingPlacement {
  push: number;
  covered: HTMLElement | null;
  separators: HTMLElement[];
}

const place = (badge: HTMLDivElement | null, { push, covered, separators }: PendingPlacement) => {
  for (const separator of separators) separator.toggleAttribute('data-covered', separator === covered);
  if (badge) badge.style.transform = push ? `translateY(${push}px)` : '';
};

interface StickyDateBadgeOptions {
  chatContainerRef: RefObject<HTMLDivElement | null>;
  active: boolean;
  contentKey: unknown;
}

export const useStickyDateBadge = ({ chatContainerRef, active, contentKey }: StickyDateBadgeOptions) => {
  const [label, setLabel] = useState<string | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const shownLabel = useRef<string | null>(null);
  const pending = useRef<PendingPlacement>({ push: 0, covered: null, separators: [] });

  useLayoutEffect(() => place(badgeRef.current, pending.current), [label]);

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
      const all = separators();
      let current: HTMLElement | null = null;
      let next: HTMLElement | null = null;
      for (const separator of all) {
        if (separator.getBoundingClientRect().top <= top + 0.5) current = separator;
        else if (!next) next = separator;
      }
      const push = next ? Math.min(0, next.getBoundingClientRect().top - (top + height + PUSH_GAP)) : 0;
      pending.current = { push, covered: active ? current : null, separators: all };
      const nextLabel = current?.dataset.date ?? null;
      if (nextLabel === shownLabel.current) {
        place(badgeRef.current, pending.current);
        return;
      }
      shownLabel.current = nextLabel;
      setLabel(nextLabel);
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
