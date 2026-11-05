import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { thumbnailTarget } from './thumbnailTarget';
import { openerElement } from './openerElement';
import { returnToThumbnail } from './returnToThumbnail';

export function useSwipeDismiss(stage: RefObject<HTMLDivElement | null>, onClose: () => void, sources: (string | undefined)[] = []) {
  const running = useRef<Animation[]>([]);
  const opener = useRef(openerElement());
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const sourceRef = useRef(sources);
  sourceRef.current = sources;
  useEffect(() => () => {
    running.current.forEach(animation => animation.cancel());
    running.current = [];
    cleanup.current?.();
  }, []);

  return useCallback((displacement: number) => {
    if (running.current.length) return;
    const element = stage.current;
    if (!element?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    const options: KeyframeAnimationOptions = { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' };
    const target = thumbnailTarget(sourceRef.current, opener.current);
    const active = [...element.querySelectorAll<HTMLImageElement>('[data-active-slide]')];
    const shown = active.find(image => getComputedStyle(image).opacity !== '0' && image.naturalWidth > 0);
    const returning = target && shown ? returnToThumbnail(shown, target, options) : null;
    cleanup.current = returning?.cleanup;
    const animations = returning ? [returning.animation] : active.map(image => image.animate([
      { transform: getComputedStyle(image).transform === 'none' ? `translateY(${displacement}px)` : getComputedStyle(image).transform },
      { transform: `translateY(${window.innerHeight}px) scale(0.6)` },
    ], options));
    const backdrop = element.closest('[role="dialog"]');
    if (backdrop) animations.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], options));
    running.current = animations;
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      onClose();
    }).catch(() => { /* Unmounting cancels the transition. */ });
  }, [onClose, stage]);
}
