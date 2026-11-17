export const MORPH_MS = 380;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const morphElements = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[data-morph]')];

export const measureMorphs = (root: HTMLElement | null) => {
  const boxes = new Map<string, DOMRect>();
  if (!root) return boxes;
  for (const element of morphElements(root)) {
    const key = element.dataset.morph;
    if (key && !boxes.has(key)) boxes.set(key, element.getBoundingClientRect());
  }
  return boxes;
};

export const playMorphs = (root: HTMLElement, from: Map<string, DOMRect>) => {
  for (const element of morphElements(root)) {
    const start = element.dataset.morph ? from.get(element.dataset.morph) : undefined;
    if (!start || typeof element.animate !== 'function') continue;
    const end = element.getBoundingClientRect();
    if (!end.width || !end.height) continue;
    const moveOnly = element.dataset.morphMode === 'move';
    const dx = start.left - end.left;
    const dy = start.top - end.top;
    const sx = moveOnly ? 1 : start.width / end.width;
    const sy = moveOnly ? 1 : start.height / end.height;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && sx === 1 && sy === 1) continue;
    element.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
      { transform: 'translate(0px, 0px) scale(1, 1)', transformOrigin: 'top left' },
    ], { duration: MORPH_MS, easing: EASE });
  }
};
