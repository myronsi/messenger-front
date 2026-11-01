import { forwardRef, type ImgHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

export const AuthenticatedImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(({ src, ...props }, ref) => {
  const authenticatedSource = useAuthenticatedMedia(src);
  return <img {...props} src={authenticatedSource} ref={ref} />;
});
AuthenticatedImage.displayName = 'AuthenticatedImage';
