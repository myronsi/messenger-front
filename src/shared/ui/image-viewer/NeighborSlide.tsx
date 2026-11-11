import { Film, ImageOff } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import type { ViewerImage } from './ImageViewer';

interface Props {
  image: ViewerImage;
  direction: -1 | 1;
  offset: number;
  gesturing: boolean;
  broken: boolean;
  onLoad: () => void;
  onError: () => void;
}

const slideClass = 'h-full w-full max-w-none select-none object-contain';

export function NeighborSlide({ image, direction, offset, gesturing, broken, onLoad, onError }: Props) {
  const content = () => {
    if (broken) return <ImageOff className="h-10 w-10 text-white/70" />;
    if (!image.isVideo) {
      return <AuthenticatedImage src={image.url} loading="eager" alt="" className={slideClass} draggable={false} onLoad={onLoad} onError={onError} />;
    }
    return (
      <>
        {image.previewUrl
          ? <AuthenticatedImage src={image.previewUrl} loading="eager" alt="" className={slideClass} draggable={false} />
          : <Film className="h-12 w-12 text-white/30" />}
        <VideoPlayBadge size="lg" className="absolute inset-0 m-auto" />
      </>
    );
  };
  return (
    <div
      aria-hidden="true"
      data-testid={`image-viewer-${direction === -1 ? 'previous' : 'next'}-slide`}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{
        transform: `translateX(calc(${direction * 100}% + ${offset}px))`,
        transition: gesturing ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: gesturing ? 'transform' : undefined,
      }}
    >
      {content()}
    </div>
  );
}
