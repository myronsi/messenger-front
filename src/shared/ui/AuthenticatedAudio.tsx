import { forwardRef, type AudioHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

export const AuthenticatedAudio = forwardRef<HTMLAudioElement, AudioHTMLAttributes<HTMLAudioElement>>(({ src, ...props }, ref) => {
  const authenticatedSource = useAuthenticatedMedia(src);
  return <audio {...props} src={authenticatedSource} ref={ref} />;
});
AuthenticatedAudio.displayName = 'AuthenticatedAudio';
