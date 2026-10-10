import { forwardRef, type AudioHTMLAttributes } from 'react';
import { useMediaSrc } from '@/shared/api/media';

// MediaAudio is an <audio> that also plays the API's attachments, which need the access token
// (src/shared/api/media.ts).
const MediaAudio = forwardRef<HTMLAudioElement, AudioHTMLAttributes<HTMLAudioElement>>(({ src, ...props }, ref) => {
  const resolved = useMediaSrc(src);
  return <audio ref={ref} {...props} src={resolved || undefined} />;
});

MediaAudio.displayName = 'MediaAudio';

export default MediaAudio;
