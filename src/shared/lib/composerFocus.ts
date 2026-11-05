export const isMobileComposer = () => window.innerWidth < 768 || !!window.matchMedia?.('(pointer: coarse)').matches;

// Refresh stale DOM focus inside the user gesture to reopen a mobile keyboard.
export function focusComposer(field: HTMLTextAreaElement | null) {
  if (!field || field.disabled) return;
  if (isMobileComposer() && document.activeElement === field) field.blur();
  field.focus({ preventScroll: true });
}
