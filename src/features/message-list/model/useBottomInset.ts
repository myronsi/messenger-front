import { RefObject, useEffect } from 'react';

export const COMPOSER_GAP = 16;

export const bottomInsetPadding = (height: number) => `${Math.round(height) + COMPOSER_GAP}px`;

export const useBottomInset = (contentRef: RefObject<HTMLElement | null>, source?: HTMLElement | null) => {
  useEffect(() => {
    if (!source || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      const content = contentRef.current;
      if (content) content.style.paddingBottom = bottomInsetPadding(source.getBoundingClientRect().height);
    });
    observer.observe(source);
    return () => observer.disconnect();
  }, [contentRef, source]);
};
