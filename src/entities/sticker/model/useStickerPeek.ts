import { useEffect, useState } from 'react';
import { LONG_PRESS_MS } from '@/shared/lib/useLongPress';

const MOVE_TOLERANCE_PX = 10;
const CLICK_GUARD_MS = 400;

export const useStickerPeek = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!container) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    let peeking = false;
    let swallowClick = false;

    const indexAt = (x: number, y: number) => {
      const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-peek-index]');
      return tile && container.contains(tile) ? Number(tile.dataset.peekIndex) : null;
    };
    const stopWaiting = () => {
      clearTimeout(timer);
      start = null;
    };
    const onTouchStart = (event: TouchEvent) => {
      stopWaiting();
      if (event.touches.length !== 1) return;
      const { clientX, clientY } = event.touches[0];
      const first = indexAt(clientX, clientY);
      if (first === null) return;
      start = { x: clientX, y: clientY };
      timer = setTimeout(() => {
        peeking = true;
        setIndex(first);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    };
    const onTouchMove = (event: TouchEvent) => {
      const { clientX, clientY } = event.touches[0];
      if (peeking) {
        event.preventDefault();
        const next = indexAt(clientX, clientY);
        if (next !== null) setIndex(next);
        return;
      }
      if (start && Math.hypot(clientX - start.x, clientY - start.y) > MOVE_TOLERANCE_PX) stopWaiting();
    };
    const onTouchEnd = () => {
      stopWaiting();
      if (!peeking) return;
      peeking = false;
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, CLICK_GUARD_MS);
      setIndex(null);
    };
    const onPointerMove = (event: PointerEvent) => { if (peeking) event.stopPropagation(); };
    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onContextMenu = (event: Event) => { if (peeking || start) event.preventDefault(); };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('click', onClick, true);
    container.addEventListener('contextmenu', onContextMenu);
    return () => {
      stopWaiting();
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick, true);
      container.removeEventListener('contextmenu', onContextMenu);
      setIndex(null);
    };
  }, [container]);

  return { peekRef: setContainer, peekIndex: index };
};
