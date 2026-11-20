import { createPortal } from 'react-dom';
import { StickerImage } from './StickerImage';

interface PeekSticker {
  url?: string | null;
  emoji: string;
}

export const StickerPeekOverlay = ({ sticker, index }: { sticker?: PeekSticker; index: number | null }) => {
  if (!sticker || index === null || typeof document === 'undefined') return null;
  return createPortal(
    <div data-testid="sticker-peek" aria-hidden="true"
      className="sticker-peek-backdrop pointer-events-none fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
      <div className="sticker-peek-image">
        <div key={index} className="sticker-peek-swap">
          <StickerImage url={sticker.url} emoji={sticker.emoji} className="h-[min(72vw,18rem)] w-[min(72vw,18rem)]" />
        </div>
      </div>
      <span className="text-3xl leading-none">{sticker.emoji}</span>
    </div>,
    document.body,
  );
};
