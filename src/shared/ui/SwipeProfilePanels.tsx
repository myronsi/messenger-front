import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useSwipeTabs } from '@/shared/lib/useSwipeTabs';

interface Props<T extends string> {
  active: T;
  views: T[];
  onSelect: (view: T) => void;
  renderPanel: (view: T) => ReactNode;
  enabled?: boolean;
}

export function SwipeProfilePanels<T extends string>({ active, views, onSelect, renderPanel, enabled = true }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(active);
  const orderRef = useRef(views);
  orderRef.current = views;
  const { offset, dragging, releaseRef, ...handlers } = useSwipeTabs(active, views, onSelect, enabled);
  const index = views.indexOf(active);
  const missing = index < 0 && views.length > 0;
  const fallback = missing ? views[0] : undefined;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    if (fallback !== undefined) onSelectRef.current(fallback);
  }, [fallback]);
  const shown = missing ? 0 : index;
  useLayoutEffect(() => {
    const scope = root.current?.closest<HTMLElement>('[data-profile-swipe]');
    if (!scope) return;
    const progress = offset / (root.current?.clientWidth || window.innerWidth);
    scope.style.setProperty('--profile-swipe-next', String(Math.min(1, Math.max(0, -progress))));
    scope.style.setProperty('--profile-swipe-previous', String(Math.min(1, Math.max(0, progress))));
    scope.style.setProperty('--profile-swipe-transition', dragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)');
  }, [offset, dragging]);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = active;
    if (from === active) return;
    const release = releaseRef.current;
    releaseRef.current = null;
    if (!root.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const width = root.current.clientWidth;
    const order = orderRef.current;
    const delta = order.indexOf(active) - order.indexOf(from);
    if (!delta || order.indexOf(from) < 0) return;
    const dx = release?.from === from ? release.dx : 0;
    const animations = [...root.current.children].flatMap((child, i) => {
      if (!child.animate) return [];
      const end = (i - order.indexOf(active)) * width;
      return [child.animate([
        { transform: `translateX(${end + delta * width + dx}px)` },
        { transform: `translateX(${end}px)` },
      ], { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })];
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [active, releaseRef]);
  return (
    <div ref={root} {...handlers} data-testid="swipe-profile-panels" className="relative min-h-0 flex-1 touch-pan-y overflow-hidden bg-white">
      {views.map((view, i) => (
        <div key={view} aria-hidden={i !== shown} inert={i !== shown} data-profile-panel={view}
          className="absolute inset-0 touch-pan-y overflow-y-auto bg-white"
          style={{ transform: `translateX(calc(${(i - shown) * 100}% + ${offset}px))`,
            transition: dragging || previous.current !== active ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: dragging ? 'transform' : undefined }}>
          {renderPanel(view)}
        </div>
      ))}
    </div>
  );
}
