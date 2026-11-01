import { forwardRef, useEffect, useRef, useState, type AudioHTMLAttributes } from 'react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';

export const AuthenticatedAudio = forwardRef<HTMLAudioElement, AudioHTMLAttributes<HTMLAudioElement>>(({
  src, onPlay, onPointerDown, onFocus, onKeyDown, ...props
}, ref) => {
  const [requested, setRequested] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const authenticatedSource = useAuthenticatedMedia(src, undefined, requested);
  useEffect(() => {
    if (playRequested && authenticatedSource) void audioRef.current?.play().catch(() => undefined);
  }, [playRequested, authenticatedSource]);
  return <audio {...props} src={authenticatedSource} ref={node => {
    audioRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} onPointerDown={event => { setRequested(true); setPlayRequested(true); onPointerDown?.(event); }}
    onFocus={event => { setRequested(true); onFocus?.(event); }}
    onKeyDown={event => {
      if (event.key === ' ' || event.key === 'Enter') { setRequested(true); setPlayRequested(true); }
      onKeyDown?.(event);
    }} onPlay={onPlay} />;
});
AuthenticatedAudio.displayName = 'AuthenticatedAudio';
