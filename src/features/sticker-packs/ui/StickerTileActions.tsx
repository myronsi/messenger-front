import { useState, type ReactNode } from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { StickerEmojiPicker } from './StickerEmojiPicker';

interface StickerTileActionsProps {
  sticker: Sticker;
  isFirst: boolean;
  busy: boolean;
  onCover: () => void;
  onEmoji: (emoji: string) => void;
  onDelete: () => void;
}

interface ActionProps {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  onClick: () => void;
}

const Action = ({ label, icon, disabled, danger, active, onClick }: ActionProps) => (
  <button type="button" disabled={disabled} aria-label={label} aria-pressed={active} onClick={onClick}
    className={`motion-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-40 ${
      danger ? 'text-destructive' : ''} ${active ? 'bg-accent' : ''}`}>
    <span className="flex h-6 items-center justify-center">{icon}</span>
    <span className="hidden w-full truncate text-center min-[400px]:block">{label}</span>
  </button>
);

export const StickerTileActions = ({ sticker, isFirst, busy, onCover, onEmoji, onDelete }: StickerTileActionsProps) => {
  const { translations } = useLanguage();
  const [picking, setPicking] = useState(false);
  return (
    <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-lg" data-testid="sticker-tile-actions">
      {picking && <StickerEmojiPicker value={sticker.emoji} onChange={(emoji) => { setPicking(false); onEmoji(emoji); }} />}
      <div className="flex items-stretch gap-1">
        <Action label={translations.changeStickerEmoji} active={picking} disabled={busy} onClick={() => setPicking((value) => !value)}
          icon={<span className="text-lg leading-none">{sticker.emoji}</span>} />
        <Action label={translations.makeStickerCover} disabled={busy || isFirst} onClick={onCover} icon={<Star className="h-5 w-5" />} />
        <Action label={translations.deleteSticker} danger disabled={busy} onClick={onDelete} icon={<Trash2 className="h-5 w-5" />} />
      </div>
    </div>
  );
};
