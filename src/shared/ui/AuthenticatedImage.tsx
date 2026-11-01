import { forwardRef, useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

interface Props extends ImgHTMLAttributes<HTMLImageElement> { fallbackSrc?: string; }

export const AuthenticatedImage = forwardRef<HTMLImageElement, Props>(({ src, fallbackSrc, onError, ...props }, ref) => {
  const [brokenSource, setBrokenSource] = useState<string>();
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(image);
    return () => observer.disconnect();
  }, []);
  const handleFailure = useCallback(() => {
    if (fallbackSrc && brokenSource !== src) setBrokenSource(src);
    if (imageRef.current) onError?.({ currentTarget: imageRef.current, target: imageRef.current } as unknown as React.SyntheticEvent<HTMLImageElement, Event>);
  }, [brokenSource, fallbackSrc, onError, src]);
  const authenticatedSource = useAuthenticatedMedia(brokenSource === src && fallbackSrc ? fallbackSrc : src, fallbackSrc, visible, handleFailure);
  return <img {...props} src={authenticatedSource} ref={node => {
    imageRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} onError={handleFailure} />;
});
AuthenticatedImage.displayName = 'AuthenticatedImage';
