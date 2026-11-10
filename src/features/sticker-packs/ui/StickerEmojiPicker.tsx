import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EMOJI_SETS } from '@/shared/lib/emojiSets';
import { cn } from '@/shared/lib/utils';

interface StickerEmojiPickerProps {
  value: string | null;
  onChange: (emoji: string) => void;
}

export const StickerEmojiPicker = ({ value, onChange }: StickerEmojiPickerProps) => {
  const { translations } = useLanguage();
  return (
    <div className="max-h-40 overflow-y-auto rounded-xl border border-border" role="listbox" aria-label={translations.stickerChooseEmoji}>
      {EMOJI_SETS.map((set) => (
        <div key={set.label} className="grid grid-cols-8 gap-0.5 p-1">
          {set.emoji.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="option"
              aria-selected={value === emoji}
              aria-label={emoji}
              onClick={() => onChange(emoji)}
              className={cn('flex aspect-square items-center justify-center rounded-md text-xl leading-none transition-colors hover:bg-accent',
                value === emoji && 'bg-primary/20 ring-2 ring-primary')}
            >
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
