import { useLayoutEffect, useRef, type RefObject } from 'react';
import { thumbnailTarget } from './thumbnailTarget';
import { openerElement } from './openerElement';

export function thumbnailShape(target: HTMLImageElement) {
  const parent = target.parentElement;
  const frame = parent && getComputedStyle(parent).overflow === 'hidden' ? parent : target;
  const rect = frame.getBoundingClientRect();
  const value = getComputedStyle(frame).borderTopLeftRadius || getComputedStyle(frame).borderRadius || '0';
  const radius = value.includes('%') ? parseFloat(value) / 100 * Math.min(rect.width, rect.height) : parseFloat(value) || 0;
  return { rect, radius: Math.min(radius, rect.width / 2, rect.height / 2) };
}

export function morphClip(width: number, height: number, naturalWidth: number, naturalHeight: number, aspect: number, roundness: number, progress: number) {
  const fit = Math.min(width / naturalWidth, height / naturalHeight);
  const fittedWidth = naturalWidth * fit;
  const fittedHeight = naturalHeight * fit;
  const croppedWidth = Math.min(fittedWidth, fittedHeight * aspect);
  const croppedHeight = Math.min(fittedHeight, fittedWidth / aspect);
  const visibleWidth = fittedWidth + (croppedWidth - fittedWidth) * progress;
  const visibleHeight = fittedHeight + (croppedHeight - fittedHeight) * progress;
  const x = (width - visibleWidth) / 2;
  const y = (height - visibleHeight) / 2;
  const radius = Math.min(visibleWidth, visibleHeight) * roundness * progress;
  return `inset(${y}px ${x}px ${y}px ${x}px round ${radius}px)`;
}

export function useSwipeMorph(stage: RefObject<HTMLDivElement | null>, displacement: number, sources: (string | undefined)[]) {
  const opener = useRef(openerElement());
  useLayoutEffect(() => {
    const images = stage.current?.querySelectorAll<HTMLImageElement>('[data-active-slide]');
    if (!images) return;
    const target = displacement > 0 ? thumbnailTarget(sources, opener.current) : null;
    const shape = target ? thumbnailShape(target) : null;
    const progress = Math.min(1, displacement / (window.innerHeight * 0.4));
    images.forEach(image => {
      if (!shape || !image.naturalWidth || !image.offsetWidth || !shape.rect.height) {
        image.style.clipPath = '';
        return;
      }
      image.style.clipPath = morphClip(image.offsetWidth, image.offsetHeight, image.naturalWidth, image.naturalHeight,
        shape.rect.width / shape.rect.height, shape.radius / Math.min(shape.rect.width, shape.rect.height), progress);
    });
  }, [displacement, sources, stage]);
}
