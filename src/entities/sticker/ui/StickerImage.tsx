import { useState } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';
import { useMediaReveal } from '@/shared/lib/useMediaReveal';

interface StickerImageProps {
  url?: string | null;
  stillUrl?: string | null;
  emoji: string;
  className?: string;
  onBroken?: () => void;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const StickerImage = ({ url, stillUrl, emoji, className, onBroken }: StickerImageProps) => {
  const [active, setActive] = useState(false);
  const shown = stillUrl && (!active || reducedMotion()) ? stillUrl : url;
  const fallback = shown !== url && url ? resolveMediaUrl(url) : undefined;
  const { loaded, pop, onLoad } = useMediaReveal(url ?? stillUrl);
  return (
    <span data-testid="sticker-image" className={cn('media-standin-box relative block', className)}>
      {!loaded && <span aria-hidden="true" data-testid="sticker-standin" data-standin={emoji} className="media-standin sticker-standin absolute inset-0" />}
      <AuthenticatedImage
        src={shown ? resolveMediaUrl(shown) : undefined}
        fallbackSrc={fallback}
        alt={emoji}
        draggable={false}
        onError={onBroken}
        onLoad={onLoad}
        onPointerEnter={stillUrl ? () => setActive(true) : undefined}
        onPointerLeave={stillUrl ? () => setActive(false) : undefined}
        className={cn('h-full w-full select-none rounded-[10%] object-contain', loaded ? pop && 'media-pop-in' : 'opacity-0')}
      />
    </span>
  );
};
