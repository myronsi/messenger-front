const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SAFETY_MS = 150;

const onScreen = (element: HTMLElement) => {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight;
};

export const findMiniCover = () => [...document.querySelectorAll<HTMLElement>('[data-mini-cover]')].find(onScreen) ?? null;

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Flight {
  source: HTMLElement;
  from: DOMRect;
  to: DOMRect;
  fromRadius: string;
  toRadius: string;
  duration: number;
  onDone?: () => void;
}

export const flyCover = ({ source, from, to, fromRadius, toRadius, duration, onDone }: Flight) => {
  if (typeof source.animate !== 'function') {
    onDone?.();
    return;
  }
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-mini-cover');
  ghost.removeAttribute('data-testid');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset.coverFlight = 'true';
  Object.assign(ghost.style, {
    position: 'fixed', left: '0', top: '0', margin: '0', zIndex: '2000', pointerEvents: 'none', visibility: 'visible', overflow: 'hidden',
    boxShadow: '0 24px 48px rgb(0 0 0 / 0.35)',
  });
  document.body.appendChild(ghost);
  const frame = (box: DOMRect, radius: string) => ({
    transform: `translate(${box.left}px, ${box.top}px)`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: radius,
  });
  const animation = ghost.animate([frame(from, fromRadius), frame(to, toRadius)], { duration, easing: EASE, fill: 'forwards' });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    ghost.remove();
    onDone?.();
  };
  animation.onfinish = finish;
  animation.oncancel = finish;
  window.setTimeout(finish, duration + SAFETY_MS);
};
