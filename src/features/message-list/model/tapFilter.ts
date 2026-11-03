const TAP_AFTER_SCROLL_MS = 250;
const INTERACTIVE = 'button, a, img, video, audio, input, textarea, [role="button"], [data-message-action]';

export const isIgnoredTap = (event: Pick<MouseEvent, 'target'>, lastScrollAt: number, now = Date.now()) => {
  if (now - lastScrollAt < TAP_AFTER_SCROLL_MS) return true;
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest('.motion-message-bubble') || target.closest(INTERACTIVE)) return true;
  return !!window.getSelection()?.toString();
};
