import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Keep the released drag position while the new active slide takes over.
export function useGallerySwipe(stage: RefObject<HTMLDivElement | null>, index: number, count: number, go: (direction: -1 | 1) => void) {
  const pending = useRef<{ direction: -1 | 1; displacement: number } | null>(null);
  const animations = useRef<Animation[]>([]);
  const onSwipe = useCallback((direction: -1 | 1, displacement: number) => {
    if (index + direction < 0 || index + direction >= count) return;
    pending.current = { direction, displacement };
    go(direction);
  }, [count, go, index]);

  useLayoutEffect(() => {
    const drag = pending.current;
    pending.current = null;
    if (!drag || !stage.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const { direction, displacement } = drag;
    const width = stage.current.clientWidth;
    const options = { duration: 280, easing: EASING };
    const animate = (element: Element, from: number, to: number) => {
      if (!element.animate) return;
      animations.current.push(element.animate([
        { transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` },
      ], options));
    };
    stage.current.querySelectorAll('[data-active-slide]').forEach(element => animate(element, direction * width + displacement, 0));
    const outgoing = stage.current.querySelector(`[data-testid="image-viewer-${direction === 1 ? 'previous' : 'next'}-slide"]`);
    if (outgoing) animate(outgoing, displacement, -direction * width);
    return () => {
      animations.current.forEach(animation => animation.cancel());
      animations.current = [];
    };
  }, [index, stage]);

  return onSwipe;
}
