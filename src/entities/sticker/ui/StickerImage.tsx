import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';

interface StickerImageProps {
  url?: string | null;
  emoji: string;
  className?: string;
  onBroken?: () => void;
}

export const StickerImage = ({ url, emoji, className, onBroken }: StickerImageProps) => (
  <AuthenticatedImage
    src={url ? resolveMediaUrl(url) : undefined}
    alt={emoji}
    draggable={false}
    onError={onBroken}
    className={cn('select-none object-contain', className)}
  />
);
