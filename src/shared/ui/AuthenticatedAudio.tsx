import { forwardRef, useEffect, useRef, useState, type AudioHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

export const AuthenticatedAudio = forwardRef<HTMLAudioElement, AudioHTMLAttributes<HTMLAudioElement>>(({ src, onPlay, onPointerDown, ...props }, ref) => {
  const [requested, setRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const authenticatedSource = useAuthenticatedMedia(src, undefined, requested);
  useEffect(() => {
    if (requested && authenticatedSource) void audioRef.current?.play().catch(() => undefined);
  }, [requested, authenticatedSource]);
  return <audio {...props} src={authenticatedSource} ref={node => {
    audioRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} onPointerDown={event => { setRequested(true); onPointerDown?.(event); }} onPlay={onPlay} />;
});
AuthenticatedAudio.displayName = 'AuthenticatedAudio';
