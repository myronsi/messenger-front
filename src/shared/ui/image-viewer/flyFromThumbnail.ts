import { thumbnailShape } from './useSwipeMorph';

export const OPEN_FLIGHT: KeyframeAnimationOptions = { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' };

const containedRect = (box: DOMRect, aspect: number) => {
  const width = Math.min(box.width, box.height * aspect);
  const height = width / aspect;
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
};

const strokesOf = (thumbnail: HTMLImageElement) => {
  const frame = thumbnail.parentElement;
  const overlay = frame?.querySelector<SVGSVGElement>(':scope > [data-testid="drawing-overlay"]');
  if (!overlay) return null;
  const strokes = overlay.cloneNode(true) as SVGSVGElement;
  strokes.removeAttribute('class');
  strokes.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  Object.assign(strokes.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', transform: 'none', transition: 'none' });
  return strokes;
};

export function flyFromThumbnail(thumbnail: HTMLImageElement, stage: HTMLElement, options: KeyframeAnimationOptions = OPEN_FLIGHT) {
  if (!thumbnail.naturalWidth || !thumbnail.naturalHeight) return null;
  const { rect: from, radius } = thumbnailShape(thumbnail);
  const box = stage.getBoundingClientRect();
  if (!from.width || !from.height || !box.width || !box.height) return null;
  const to = containedRect(box, thumbnail.naturalWidth / thumbnail.naturalHeight);
  const shell = document.createElement('div');
  if (typeof shell.animate !== 'function') return null;
  Object.assign(shell.style, {
    position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
    overflow: 'hidden', pointerEvents: 'none', zIndex: '10002', borderRadius: `${radius}px`,
  });
  shell.setAttribute('aria-hidden', 'true');
  shell.setAttribute('data-open-flight', '');
  const clone = document.createElement('img');
  clone.src = thumbnail.currentSrc || thumbnail.src;
  Object.assign(clone.style, { width: '100%', height: '100%', objectFit: 'cover', objectPosition: getComputedStyle(thumbnail).objectPosition });
  shell.append(clone);
  const strokes = strokesOf(thumbnail);
  if (strokes) shell.append(strokes);
  document.body.append(shell);
  const previousVisibility = stage.style.visibility;
  stage.style.visibility = 'hidden';
  const animation = shell.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: `${radius}px` },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: '0px' },
  ], options);
  return {
    animation,
    cleanup: () => {
      shell.remove();
      stage.style.visibility = previousVisibility;
    },
  };
}
