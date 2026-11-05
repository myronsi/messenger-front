import { useCallback, useEffect, useRef, type RefObject } from 'react';

export function useFadeClose(stage: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const running = useRef<Animation | null>(null);
  useEffect(() => () => { running.current?.cancel(); }, []);
  return useCallback(() => {
    if (running.current) return;
    const viewer = stage.current?.closest<HTMLElement>('[role="dialog"]');
    if (!viewer?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    const animation = viewer.animate([
      { opacity: getComputedStyle(viewer).opacity || '1' }, { opacity: 0 },
    ], { duration: 100, easing: 'ease-out', fill: 'forwards' });
    running.current = animation;
    void animation.finished.then(onClose).catch(() => { /* Unmounting cancels the fade. */ });
  }, [onClose, stage]);
}
