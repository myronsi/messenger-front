const POINTER_OPEN_WINDOW_MS = 1000;

let lastPointer: { target: HTMLElement; at: number } | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (event) => {
    lastPointer = event.target instanceof HTMLElement ? { target: event.target, at: Date.now() } : null;
  }, true);
}

export function openerElement(): HTMLElement | null {
  if (lastPointer && lastPointer.target.isConnected && Date.now() - lastPointer.at < POINTER_OPEN_WINDOW_MS) return lastPointer.target;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active !== document.documentElement) return active;
  return null;
}
