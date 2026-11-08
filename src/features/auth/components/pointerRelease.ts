let pointerDown = false;

if (typeof window !== 'undefined') {
  const release = () => { pointerDown = false; };
  window.addEventListener('pointerdown', () => { pointerDown = true; }, true);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
}

export const afterPointerRelease = (action: () => void) => {
  if (!pointerDown) {
    action();
    return;
  }
  const run = () => {
    window.removeEventListener('pointerup', run);
    window.removeEventListener('pointercancel', run);
    window.setTimeout(action, 0);
  };
  window.addEventListener('pointerup', run);
  window.addEventListener('pointercancel', run);
};
