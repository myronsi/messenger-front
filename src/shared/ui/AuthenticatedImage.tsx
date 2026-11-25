import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { isDefaultAvatar, letterAvatar } from '@/shared/lib/letterAvatar';
import { sizedAvatarUrl } from '@/shared/lib/avatarSize';
import { EMPTY_IMAGE, avatarBlur, isAvatarSource, rememberAvatarBlur } from '@/shared/lib/avatarBlur';

interface Props extends ImgHTMLAttributes<HTMLImageElement> { fallbackSrc?: string; initialsFrom?: string; attachmentAvatar?: boolean; }

const MUTED = 'hsl(var(--muted))';

const scrollParent = (node: HTMLElement) => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return null;
};

export const AuthenticatedImage = forwardRef<HTMLImageElement, Props>((
  { src, fallbackSrc, initialsFrom, attachmentAvatar, onError, onLoad, ...props }, ref,
) => {
  const [brokenSource, setBrokenSource] = useState<string>();
  const [reloaded, setReloaded] = useState<string>();
  const shownRef = useRef<string | undefined>(undefined);
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [box, setBox] = useState<number>();
  const placeholderShownRef = useRef<'blur' | 'empty' | null>(null);
  useLayoutEffect(() => { setBox(imageRef.current?.getBoundingClientRect().width ?? 0); }, []);
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
  const mediaSource = useAuthenticatedMedia(brokenSource === src && fallbackSrc ? fallbackSrc : sizedAvatarUrl(src, box ?? 0, attachmentAvatar), fallbackSrc,
    box !== undefined && (visible || props.loading === 'eager'), handleFailure, reloaded === src ? 1 : 0);
  const name = initialsFrom ?? props.alt;
  const showsFallback = !src || (brokenSource === src && !!fallbackSrc);
  const showsDefault = isDefaultAvatar(src) || (showsFallback && isDefaultAvatar(fallbackSrc)) || isDefaultAvatar(mediaSource);
  const authenticatedSource = name && showsDefault ? letterAvatar(name) : mediaSource;
  shownRef.current = authenticatedSource;
  const avatar = !!src && (attachmentAvatar || isAvatarSource(src));
  const blur = avatar && !authenticatedSource ? avatarBlur(src) : undefined;
  const placeholder = avatar && !authenticatedSource ? blur ?? EMPTY_IMAGE : undefined;
  if (placeholder) placeholderShownRef.current = blur ? 'blur' : 'empty';
  const style = placeholderShownRef.current === 'empty' ? { backgroundColor: MUTED, ...props.style } : props.style;
  const remember = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (avatar && authenticatedSource && image.getAttribute('src') === authenticatedSource) {
      if (placeholderShownRef.current) {
        image.dataset.reveal = placeholderShownRef.current;
        if (image.style.backgroundColor) image.style.backgroundColor = '';
        placeholderShownRef.current = null;
      }
      if (src && !showsDefault) rememberAvatarBlur(src, image);
    }
    onLoad?.(event);
  };
  return <img {...props} style={style} data-media-source={src} data-placeholder={placeholder ? (blur ? 'blur' : 'empty') : undefined}
    alt={authenticatedSource ? props.alt : ''} src={authenticatedSource ?? placeholder} onLoad={remember} ref={node => {
    imageRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} onError={handleFailure} />;
});
AuthenticatedImage.displayName = 'AuthenticatedImage';
