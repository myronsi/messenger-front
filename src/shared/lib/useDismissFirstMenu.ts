import { useEffect, type RefObject } from 'react';

const consume = (event: Event) => {
  if (event.cancelable) event.preventDefault();
  event.stopImmediatePropagation();
};

// Keep swallowing the dismissing gesture even after closing unmounts the menu.
function consumeRemainingGesture(original: Event) {
  const controller = new AbortController();
  const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend',
    'touchcancel', 'mousedown', 'mouseup', 'click', 'contextmenu'];
  const timer = window.setTimeout(() => controller.abort(), 10000);
  const finish = () => { window.clearTimeout(timer); controller.abort(); };
  const handler = (event: Event) => {
    if (event === original) return;
    // A genuinely new press should work normally.
    if (event.type === 'pointerdown') { finish(); return; }
    consume(event);
    if (event.type === 'click') finish();
  };
  types.forEach(type => document.addEventListener(type, handler, { capture: true, passive: false, signal: controller.signal }));
}

export function useDismissFirstMenu(open: boolean, menu: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!(event.target instanceof Node) || menu.current?.contains(event.target)) return;
      consume(event);
      if (event.type === 'pointerdown') consumeRemainingGesture(event);
      close();
    };
    const types = ['pointerdown', 'click', 'contextmenu'];
    types.forEach(type => document.addEventListener(type, outside, true));
    return () => types.forEach(type => document.removeEventListener(type, outside, true));
  }, [open, menu, close]);
}
