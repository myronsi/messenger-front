import { useLayoutEffect } from 'react';
import { thumbnailTarget } from './thumbnailTarget';

const placeOf = (image: HTMLImageElement) => {
  const parent = image.parentElement;
  return parent && getComputedStyle(parent).overflow === 'hidden' ? parent : image;
};

export function useHiddenThumbnail(sources: (string | undefined)[], opener: HTMLElement | null) {
  const key = sources.map((source) => source ?? '').join('\n');
  useLayoutEffect(() => {
    const target = thumbnailTarget(key.split('\n'), opener);
    if (!target) return undefined;
    const place = placeOf(target);
    const previous = place.style.visibility;
    place.style.visibility = 'hidden';
    return () => { place.style.visibility = previous; };
  }, [key, opener]);
}
