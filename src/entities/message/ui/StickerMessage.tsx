import { useRef, useState } from 'react';
import { StickerImage, StickerPackDialog, type StickerPackRef } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { LONG_PRESS_MS } from '@/shared/lib/useLongPress';
import type { MessageSticker } from '../model/types';

interface StickerMessageProps {
  sticker: MessageSticker;
  onBroken?: () => void;
}

export const StickerMessage = ({ sticker, onBroken }: StickerMessageProps) => {
  const { translations } = useLanguage();
  const [pack, setPack] = useState<StickerPackRef | null>(null);
  const touchedAt = useRef<number | null>(null);
  const ref = sticker.pack_slug ? { slug: sticker.pack_slug } : sticker.pack_id ? { packId: String(sticker.pack_id) } : null;
  const image = <StickerImage url={sticker.image_url} emoji={sticker.emoji} onBroken={onBroken} className="h-40 w-40 max-w-full" />;
  if (!ref) return <div data-testid="sticker-message">{image}</div>;
  return (
    <>
      <button
        type="button"
        data-testid="sticker-message"
        aria-label={translations.stickerLabel.replace('{emoji}', sticker.emoji)}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onTouchStart={() => { touchedAt.current = Date.now(); }}
        onClick={(event) => {
          const pressed = touchedAt.current;
          touchedAt.current = null;
          if (pressed !== null && Date.now() - pressed >= LONG_PRESS_MS) return;
          event.stopPropagation();
          setPack(ref);
        }}
      >
        {image}
      </button>
      {pack && <StickerPackDialog pack={pack} onClose={() => setPack(null)} />}
    </>
  );
};
