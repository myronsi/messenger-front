// Layout changes after a tap must not be mistaken for manual scrolling.
export function listenForScrollIntent(container: HTMLElement, stopSettling: () => void, onScrollIntent: () => void) {
  const scrollIntent = () => { stopSettling(); onScrollIntent(); };
  const scrollKey = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
        && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"], button'))) scrollIntent();
  };
  const scrollbarInput = (event: PointerEvent) => {
    if (event.target === container && container.offsetWidth > container.clientWidth
        && event.clientX >= container.getBoundingClientRect().left + container.clientWidth) scrollIntent();
  };
  const taps = ['touchstart', 'pointerdown', 'keydown'];
  taps.forEach((name) => container.addEventListener(name, stopSettling, { passive: true }));
  container.addEventListener('wheel', scrollIntent, { passive: true });
  container.addEventListener('touchmove', scrollIntent, { passive: true });
  container.addEventListener('keydown', scrollKey);
  container.addEventListener('pointerdown', scrollbarInput);
  return () => {
    taps.forEach((name) => container.removeEventListener(name, stopSettling));
    container.removeEventListener('wheel', scrollIntent);
    container.removeEventListener('touchmove', scrollIntent);
    container.removeEventListener('keydown', scrollKey);
    container.removeEventListener('pointerdown', scrollbarInput);
  };
}
