import { forwardRef, useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { isDefaultAvatar, letterAvatar } from '@/shared/lib/letterAvatar';

interface Props extends ImgHTMLAttributes<HTMLImageElement> { fallbackSrc?: string; initialsFrom?: string; }

const scrollParent = (node: HTMLElement) => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return null;
};

export const AuthenticatedImage = forwardRef<HTMLImageElement, Props>(({ src, fallbackSrc, initialsFrom, onError, ...props }, ref) => {
  const [brokenSource, setBrokenSource] = useState<string>();
  const [reloaded, setReloaded] = useState<string>();
  const shownRef = useRef<string | undefined>(undefined);
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { root: scrollParent(image), rootMargin: '100% 0px' });
    observer.observe(image);
    return () => observer.disconnect();
  }, []);
  const handleFailure = useCallback(() => {
    if (src && reloaded !== src && shownRef.current?.startsWith('blob:')) { setReloaded(src); return; }
    if (fallbackSrc && brokenSource !== src) setBrokenSource(src);
    if (imageRef.current) onError?.({ currentTarget: imageRef.current, target: imageRef.current } as unknown as React.SyntheticEvent<HTMLImageElement, Event>);
  }, [brokenSource, fallbackSrc, onError, reloaded, src]);
  const mediaSource = useAuthenticatedMedia(brokenSource === src && fallbackSrc ? fallbackSrc : src, fallbackSrc, visible || props.loading === 'eager', handleFailure,
    reloaded === src ? 1 : 0);
  const name = initialsFrom ?? props.alt;
  const showsFallback = !src || (brokenSource === src && !!fallbackSrc);
  const showsDefault = isDefaultAvatar(src) || (showsFallback && isDefaultAvatar(fallbackSrc)) || isDefaultAvatar(mediaSource);
  const authenticatedSource = name && showsDefault ? letterAvatar(name) : mediaSource;
  shownRef.current = authenticatedSource;
  return <img {...props} data-media-source={src} alt={authenticatedSource ? props.alt : ''} src={authenticatedSource} ref={node => {
    imageRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} onError={handleFailure} />;
});
AuthenticatedImage.displayName = 'AuthenticatedImage';
