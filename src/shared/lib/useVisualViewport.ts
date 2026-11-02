import { useEffect } from 'react';

const HEIGHT_VAR = '--visual-viewport-height';
const TOP_VAR = '--visual-viewport-top';

export const visualViewportStyle = {
  top: `var(${TOP_VAR}, 0px)`,
  height: `var(${HEIGHT_VAR}, 100dvh)`,
};

export const useVisualViewport = (enabled: boolean) => {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    if (!enabled || !viewport) return;
    const update = () => {
      if (viewport.scale > 1.01) return;
      root.style.setProperty(HEIGHT_VAR, `${Math.round(viewport.height)}px`);
      root.style.setProperty(TOP_VAR, `${Math.round(viewport.offsetTop)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.style.removeProperty(HEIGHT_VAR);
      root.style.removeProperty(TOP_VAR);
    };
  }, [enabled]);
};
