export const isMobileComposer = () => window.innerWidth < 768 || !!window.matchMedia?.('(pointer: coarse)').matches;

const KEYBOARD_MIN_HEIGHT = 120;
const fullViewportHeights = new Map<number, number>();

const keyboardHeights = new Map<number, number>();

const rememberViewportHeight = () => {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1.01) return;
  const width = Math.round(viewport.width);
  const full = Math.max(fullViewportHeights.get(width) ?? 0, viewport.height);
  fullViewportHeights.set(width, full);
  if (full - viewport.height > KEYBOARD_MIN_HEIGHT) keyboardHeights.set(width, Math.round(full - viewport.height));
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

export function keyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1.01) return 0;
  rememberViewportHeight();
  const inset = (fullViewportHeights.get(Math.round(viewport.width)) ?? viewport.height) - viewport.height;
  return inset > KEYBOARD_MIN_HEIGHT ? Math.round(inset) : 0;
}

export function lastKeyboardHeight() {
  const viewport = window.visualViewport;
  if (!viewport) return null;
  rememberViewportHeight();
  return keyboardHeights.get(Math.round(viewport.width)) ?? null;
}

// Refresh stale DOM focus inside the user gesture to reopen a mobile keyboard.
export function focusComposer(field: HTMLTextAreaElement | null) {
  if (!field || field.disabled) return;
  if (isMobileComposer() && document.activeElement === field) field.blur();
  field.focus({ preventScroll: true });
}
