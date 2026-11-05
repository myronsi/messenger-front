import { ImageOff } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
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

export function NeighborSlide({ image, direction, offset, gesturing, broken, onLoad, onError }: Props) {
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
      {broken ? <ImageOff className="h-10 w-10 text-white/70" /> : (
        <AuthenticatedImage
          src={image.url}
          loading="eager"
          alt=""
          className="h-[80vh] w-[calc(100vw-16px)] max-w-none sm:w-[80vw] select-none rounded-lg object-contain"
          draggable={false}
          onLoad={onLoad}
          onError={onError}
        />
      )}
    </div>
  );
}
