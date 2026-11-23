import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flyFromThumbnail } from './flyFromThumbnail';
import { openerElement } from './openerElement';
import { thumbnailTarget } from './thumbnailTarget';

const MAX_WAIT_FRAMES = 60;

const shownImageReady = (stage: HTMLElement) => [...stage.querySelectorAll<HTMLImageElement>('img[data-active-slide]')]
  .some((image) => image.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity !== '0');

export function useOpenFlight(stage: RefObject<HTMLDivElement | null>, mounted: boolean, sources: (string | undefined)[], enabled: boolean) {
  const opener = useRef(openerElement());
  const started = useRef(false);
  const sourcesRef = useRef(sources);
  const enabledRef = useRef(enabled);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!mounted || !element || started.current) return undefined;
    started.current = true;
    if (!enabledRef.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const thumbnail = thumbnailTarget(sourcesRef.current, opener.current);
    const flight = thumbnail ? flyFromThumbnail(thumbnail, element) : null;
    if (!flight) return undefined;
    let frame = 0;
    let waited = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      flight.cleanup();
    };
    const revealWhenReady = () => {
      if (shownImageReady(element) || waited >= MAX_WAIT_FRAMES) {
        finish();
        return;
      }
      waited += 1;
      frame = requestAnimationFrame(revealWhenReady);
    };
    flight.animation.finished.then(revealWhenReady, finish);
    return () => {
      started.current = false;
      flight.animation.cancel();
      finish();
    };
  }, [mounted, stage]);
}
