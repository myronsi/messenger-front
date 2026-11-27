import { useRef, useState } from 'react';
import type { ImageSize } from '../model/crop';
import { cropStyle, type StickerClip } from '../model/clip';

interface ClipPreviewProps {
  src: string;
  kind: StickerClip['kind'];
  clip: StickerClip;
  label: string;
}

export const ClipPreview = ({ src, kind, clip, label }: ClipPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const placed = clip.crop && size ? cropStyle(size, clip.crop) : undefined;
  const className = placed ? 'absolute max-w-none' : 'h-full w-full object-contain';
  const loop = () => {
    const video = videoRef.current;
    if (!video || clip.endMs <= clip.startMs) return;
    const at = video.currentTime * 1000;
    if (at >= clip.endMs || at < clip.startMs - 50) video.currentTime = clip.startMs / 1000;
  };
  return (
    <span data-testid="clip-preview" className="relative block h-full w-full overflow-hidden rounded-2xl">
      {kind === 'image' ? (
        <img src={src} alt={label} className={className} style={placed}
          onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      ) : (
        <video ref={videoRef} src={src} aria-label={label} className={className} style={placed} muted autoPlay loop playsInline onTimeUpdate={loop}
          onLoadedMetadata={(event) => {
            setSize({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight });
            event.currentTarget.currentTime = clip.startMs / 1000;
          }} />
      )}
    </span>
  );
};
