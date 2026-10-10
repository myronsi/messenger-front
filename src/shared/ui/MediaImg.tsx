import { forwardRef, useEffect, type ImgHTMLAttributes } from 'react';
import { useMediaSource } from '@/shared/api/media';
import { useLatestRef } from '@/shared/lib/useLatestRef';

interface MediaImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  // Shown while API media loads and when it cannot be loaded.
  fallbackSrc?: string;
  // The image cannot be shown: the API refused it (e.g. a chat the user has left) or it does not decode.
  onUnavailable?: () => void;
}

// MediaImg is an <img> that also shows the API's avatars and attachments, which need the access token
// (src/shared/api/media.ts). Local previews, blob: and data: URLs pass through unchanged.
const MediaImg = forwardRef<HTMLImageElement, MediaImgProps>(({ src, fallbackSrc, onUnavailable, onError, ...props }, ref) => {
  const media = useMediaSource(src, fallbackSrc);
  const onUnavailableRef = useLatestRef(onUnavailable);

  useEffect(() => {
    if (media.failed) onUnavailableRef.current?.();
  }, [media.failed, onUnavailableRef]);

  // A missing src renders no request at all (an empty src would ask for the page itself).
  return (
    <img
      ref={ref}
      {...props}
      src={media.src || undefined}
      onError={(event) => {
        onError?.(event);
        onUnavailable?.();
      }}
    />
  );
});

MediaImg.displayName = 'MediaImg';

export default MediaImg;
