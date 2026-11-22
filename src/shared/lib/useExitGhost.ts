import { useCallback, useLayoutEffect, useState, type Ref } from 'react';

export const EXIT_GHOST_MS = 320;

let ghostsEnabled = import.meta.env.MODE !== 'test';

export const setExitGhostsEnabled = (enabled: boolean) => { ghostsEnabled = enabled; };

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const leaveExitGhost = (node: HTMLElement | null, ghostClass = 'exit-ghost') => {
  if (!ghostsEnabled || !node?.isConnected || !node.parentNode || reducedMotion()) return null;
  if (node.getAttribute('data-state') === 'closed' || node.hasAttribute('data-closing')) return null;
  const ghost = node.cloneNode(true) as HTMLElement;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('data-exit-ghost', '');
  ghost.removeAttribute('id');
  ghost.inert = true;
  ghost.style.pointerEvents = 'none';
  if (node.hasAttribute('data-state')) ghost.setAttribute('data-state', 'closed');
  else ghost.classList.add(ghostClass);
  node.parentNode.insertBefore(ghost, node.nextSibling);
  setTimeout(() => ghost.remove(), EXIT_GHOST_MS);
  return ghost;
};

export const useExitGhost = (enabled = true) => {
  const [holder] = useState(() => ({ node: null as HTMLElement | null, enabled }));
  holder.enabled = enabled;
  useLayoutEffect(() => () => {
    if (holder.enabled) leaveExitGhost(holder.node);
  }, [holder]);
  return useCallback((node: HTMLElement | null) => {
    if (node) holder.node = node;
  }, [holder]);
};

export const composeRefs = <T,>(...refs: (Ref<T> | undefined)[]) => (node: T | null) => {
  refs.forEach((ref) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: T | null }).current = node;
  });
};
