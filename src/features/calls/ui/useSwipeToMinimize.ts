import { useEffect, useRef } from 'react';
import { CALL_VIEW_EASE, swipeDragScale, swipeShouldMinimize, type CallViewDrag } from '../model/callView';

interface Touchpoint {
  x: number;
  y: number;
  time: number;
}

const blocksSwipe = (target: EventTarget | null, root: HTMLElement) => {
  for (let node = target instanceof HTMLElement ? target : null; node && node !== root; node = node.parentElement) {
    if (node.matches('select, input, textarea')) return true;
    if (node.scrollTop > 0 && node.scrollHeight > node.clientHeight) return true;
  }
  return false;
};

const clearDragStyle = (element: HTMLElement) => {
  element.style.transform = '';
  element.style.transformOrigin = '';
};

export const useSwipeToMinimize = (element: HTMLElement | null, onMinimize: (drag: CallViewDrag) => void) => {
  const minimize = useRef(onMinimize);
  minimize.current = onMinimize;

  useEffect(() => {
    if (!element) return undefined;
    let start: Touchpoint | null = null;
    let previous: Touchpoint | null = null;
    let velocity = 0;
    let offset = 0;
    let dragging = false;

    const onStart = (event: TouchEvent) => {
      start = event.touches.length === 1 && !blocksSwipe(event.target, element)
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, time: event.timeStamp } : null;
      previous = start;
      dragging = false;
      offset = 0;
      velocity = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!start || !previous) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (!dragging) {
        if (dy < -10 || Math.abs(dx) > 10 && Math.abs(dx) > dy) { start = null; return; }
        if (dy < 10 || Math.abs(dx) > dy) return;
        dragging = true;
        element.style.transformOrigin = '50% 0';
      }
      event.preventDefault();
      const elapsed = Math.max(1, event.timeStamp - previous.time);
      velocity = (touch.clientY - previous.y) / elapsed;
      previous = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
      offset = Math.max(0, dy);
      element.style.transform = `translateY(${offset}px) scale(${swipeDragScale(offset, window.innerHeight)})`;
    };

    const onEnd = () => {
      const wasDragging = dragging;
      start = null;
      dragging = false;
      if (!wasDragging) return;
      if (swipeShouldMinimize(offset, velocity, window.innerHeight)) {
        minimize.current({ offset, scale: swipeDragScale(offset, window.innerHeight) });
        return;
      }
      const from = element.style.transform;
      clearDragStyle(element);
      if (typeof element.animate === 'function') {
        element.animate([
          { transform: from, transformOrigin: '50% 0' },
          { transform: 'translateY(0px) scale(1)', transformOrigin: '50% 0' },
        ], { duration: 240, easing: CALL_VIEW_EASE });
      }
    };

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: false });
    element.addEventListener('touchend', onEnd);
    element.addEventListener('touchcancel', onEnd);
    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onEnd);
    };
  }, [element]);
};
