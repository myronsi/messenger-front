import { useState } from 'react';
import { ChevronLeft, ChevronRight, Smile, Trash2 } from 'lucide-react';
import type { Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { StickerEmojiPicker } from './StickerEmojiPicker';

interface StickerTileActionsProps {
  sticker: Sticker;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (step: -1 | 1) => void;
  onEmoji: (emoji: string) => void;
  onDelete: () => void;
}

const action = 'motion-press flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40';

export const StickerTileActions = ({ sticker, isFirst, isLast, busy, onMove, onEmoji, onDelete }: StickerTileActionsProps) => {
  const { translations } = useLanguage();
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-2" data-testid="sticker-tile-actions">
      <div className="flex items-center justify-center gap-2">
        <button type="button" className={action} disabled={busy || isFirst} aria-label={translations.moveStickerBack} onClick={() => onMove(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" className={action} disabled={busy} aria-label={translations.changeStickerEmoji} onClick={() => setPicking((value) => !value)}>
          {picking ? <Smile className="h-4 w-4" /> : <span className="text-lg leading-none">{sticker.emoji}</span>}
        </button>
        <button type="button" className={action} disabled={busy || isLast} aria-label={translations.moveStickerForward} onClick={() => onMove(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={`${action} text-destructive`} disabled={busy} aria-label={translations.deleteSticker} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {picking && <StickerEmojiPicker value={sticker.emoji} onChange={(emoji) => { setPicking(false); onEmoji(emoji); }} />}
    </div>
  );
};
