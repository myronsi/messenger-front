import { useState } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';

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
  return (
    <AuthenticatedImage
      src={shown ? resolveMediaUrl(shown) : undefined}
      fallbackSrc={fallback}
      alt={emoji}
      draggable={false}
      onError={onBroken}
      onPointerEnter={stillUrl ? () => setActive(true) : undefined}
      onPointerLeave={stillUrl ? () => setActive(false) : undefined}
      className={cn('select-none object-contain', className)}
    />
  );
};
