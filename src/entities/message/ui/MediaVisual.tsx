import { useEffect, useState } from 'react';
import { Film, ImageOff } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

interface MediaVisualProps {
  url: string;
  poster?: string;
  isVideo: boolean;
  className?: string;
  onReady?: () => void;
  onVideoSize?: (width: number, height: number) => void;
}

export function MediaVisual({ url, poster, isVideo, className = '', onReady, onVideoSize }: MediaVisualProps) {
  const [posterFailed, setPosterFailed] = useState(false);
  const [imageFailures, setImageFailures] = useState(0);
  const isPlaceholder = isVideo && !(poster && !posterFailed) && !url.startsWith('blob:');
  useEffect(() => {
    if (isPlaceholder) onReady?.();
  }, [isPlaceholder, onReady]);
  if (!isVideo && imageFailures >= (poster && poster !== url ? 2 : 1)) {
    return (
      <span aria-hidden="true" className={`grid place-items-center bg-muted ${className}`}>
        <ImageOff className="size-6 text-muted-foreground/60" />
      </span>
    );
  }
  if (!isVideo) {
    return (
      <AuthenticatedImage src={poster || url} fallbackSrc={poster ? url : undefined} alt="" loading="lazy" decoding="async"
        draggable={false} className={className} onLoad={onReady} onError={() => { setImageFailures(count => count + 1); onReady?.(); }} />
    );
  }
  if (poster && !posterFailed) {
    return (
      <AuthenticatedImage src={poster} alt="" loading="lazy" decoding="async" draggable={false} className={className}
        onLoad={onReady} onError={() => { setPosterFailed(true); onReady?.(); }} />
    );
  }
  if (url.startsWith('blob:')) {
    return (
      <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className={className}
        onLoadedData={onReady} onError={onReady}
        onLoadedMetadata={(event) => onVideoSize?.(event.currentTarget.videoWidth, event.currentTarget.videoHeight)} />
    );
  }
  return (
    <span aria-hidden="true" className={`grid place-items-center bg-muted ${className}`}>
      <Film className="size-8 text-muted-foreground/50" />
    </span>
  );
}
