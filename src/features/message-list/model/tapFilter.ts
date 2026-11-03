const TAP_AFTER_SCROLL_MS = 250;
const CONTROLS = 'button, a, video, audio, input, textarea, [role="button"], [data-message-action]';
const INTERACTIVE = `${CONTROLS}, img`;

type Tap = Pick<MouseEvent, 'target'> & Partial<Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>>;

export const isIgnoredTap = (event: Tap, lastScrollAt: number, now = Date.now()) => {
  if (now - lastScrollAt < TAP_AFTER_SCROLL_MS) return true;
  const target = event.target instanceof Element ? event.target : null;
  if (event.ctrlKey || event.metaKey || event.shiftKey) return !target || !!target.closest(CONTROLS);
  if (!target?.closest('.motion-message-bubble') || target.closest(INTERACTIVE)) return true;
  return !!window.getSelection()?.toString();
};
