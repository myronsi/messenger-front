import { forwardRef, useState, type ImgHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

interface Props extends ImgHTMLAttributes<HTMLImageElement> { fallbackSrc?: string; }

export const AuthenticatedImage = forwardRef<HTMLImageElement, Props>(({ src, fallbackSrc, onError, ...props }, ref) => {
  const [brokenSource, setBrokenSource] = useState<string>();
  const authenticatedSource = useAuthenticatedMedia(brokenSource === src && fallbackSrc ? fallbackSrc : src, fallbackSrc);
  return <img {...props} src={authenticatedSource} ref={ref} onError={event => {
    if (fallbackSrc && brokenSource !== src) setBrokenSource(src);
    onError?.(event);
  }} />;
});
AuthenticatedImage.displayName = 'AuthenticatedImage';
