import { useState, type RefObject } from 'react';
import { Smile } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { isMobileComposer } from '@/shared/lib/composerFocus';
import { cn } from '@/shared/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { insertAtCursor } from '../model/insertAtCursor';
import { EmojiStickerPanel } from './EmojiStickerPanel';

interface EmojiInputButtonProps {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

export const EmojiInputButton = ({ inputRef, value, onChange, maxLength, className }: EmojiInputButtonProps) => {
  const { translations } = useLanguage();
  const [open, setOpen] = useState(false);
  const addEmoji = (emoji: string) => {
    const field = inputRef.current;
    const next = insertAtCursor(value, emoji, field?.selectionStart ?? value.length, field?.selectionEnd ?? value.length);
    if (maxLength !== undefined && next.value.length > maxLength) return;
    onChange(next.value);
    requestAnimationFrame(() => {
      if (!field) return;
      if (!isMobileComposer()) field.focus({ preventScroll: true });
      field.setSelectionRange(next.caret, next.caret);
    });
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={translations.emojiTab} title={translations.emojiTab} data-testid="emoji-input-button"
          className={cn('motion-press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', className)}>
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={12} onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-[1300] h-[min(24rem,55dvh)] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0">
        <EmojiStickerPanel onEmoji={addEmoji} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
