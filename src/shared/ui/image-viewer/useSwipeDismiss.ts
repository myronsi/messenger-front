import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { thumbnailTarget } from './thumbnailTarget';
import { openerElement } from './openerElement';
import { returnToThumbnail } from './returnToThumbnail';
import { useHiddenThumbnail } from './useHiddenThumbnail';

export function useSwipeDismiss(stage: RefObject<HTMLDivElement | null>, onClose: () => void, sources: (string | undefined)[] = []) {
  const running = useRef<Animation[]>([]);
  const opener = useRef(openerElement());
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const sourceRef = useRef(sources);
  sourceRef.current = sources;
  useHiddenThumbnail(sources, opener.current);
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
    const active = [...element.querySelectorAll<HTMLElement | SVGSVGElement>('[data-active-slide], [data-testid="drawing-overlay"]')];
    const shown = active.find((media): media is HTMLImageElement | HTMLVideoElement => (
      media instanceof HTMLVideoElement ? media.videoWidth > 0
        : media instanceof HTMLImageElement && getComputedStyle(media).opacity !== '0' && media.naturalWidth > 0
    ));
    const returning = target && shown ? returnToThumbnail(shown, target, options) : null;
    cleanup.current = returning?.cleanup;
    const animations = returning ? [returning.animation] : active.map(image => image.animate([
      { transform: getComputedStyle(image).transform === 'none' ? `translateY(${displacement}px)` : getComputedStyle(image).transform },
      { transform: `translateY(${displacement < 0 ? -window.innerHeight : window.innerHeight}px) scale(0.6)` },
    ], options));
    const backdrop = element.closest('[role="dialog"]');
    if (backdrop) animations.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], options));
    running.current = animations;
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      onClose();
    }).catch(() => { /* Unmounting cancels the transition. */ });
  }, [onClose, stage]);
}
