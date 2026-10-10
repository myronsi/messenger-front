import { forwardRef, type ImgHTMLAttributes } from 'react';
import { useMediaSrc } from '@/shared/api/media';

interface MediaImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  // Shown while API media loads and when it cannot be loaded.
  fallbackSrc?: string;
}

// MediaImg is an <img> that also shows the API's avatars and attachments, which need the access token
// (src/shared/api/media.ts). Local previews, blob: and data: URLs pass through unchanged.
const MediaImg = forwardRef<HTMLImageElement, MediaImgProps>(({ src, fallbackSrc, ...props }, ref) => {
  const resolved = useMediaSrc(src, fallbackSrc);
  // A missing src renders no request at all (an empty src would ask for the page itself).
  return <img ref={ref} {...props} src={resolved || undefined} />;
});

MediaImg.displayName = 'MediaImg';

export default MediaImg;
