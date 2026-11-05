export const isMobileComposer = () => window.innerWidth < 768 || !!window.matchMedia?.('(pointer: coarse)').matches;

const KEYBOARD_MIN_HEIGHT = 120;
const fullViewportHeights = new Map<number, number>();

const rememberViewportHeight = () => {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1.01) return;
  const width = Math.round(viewport.width);
  fullViewportHeights.set(width, Math.max(fullViewportHeights.get(width) ?? 0, viewport.height));
};

if (typeof window !== 'undefined') {
  rememberViewportHeight();
  window.visualViewport?.addEventListener('resize', rememberViewportHeight);
}

export function isMobileKeyboardOpen() {
  const viewport = window.visualViewport;
  if (!viewport) return true;
  rememberViewportHeight();
  const full = fullViewportHeights.get(Math.round(viewport.width)) ?? viewport.height;
  return full - viewport.height > KEYBOARD_MIN_HEIGHT;
}

// Refresh stale DOM focus inside the user gesture to reopen a mobile keyboard.
export function focusComposer(field: HTMLTextAreaElement | null) {
  if (!field || field.disabled) return;
  if (isMobileComposer() && document.activeElement === field) field.blur();
  field.focus({ preventScroll: true });
}
