import { useState, type RefObject } from 'react';
import { Smile } from 'lucide-react';
import { openStickerPacks, type Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { isMobileComposer } from '@/shared/lib/composerFocus';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { EMOJI_SETS } from '@/shared/lib/emojiSets';
import { insertAtCursor } from '../model/insertAtCursor';
import { StickerTab } from './StickerTab';

interface EmojiStickerButtonProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSticker?: (sticker: Sticker) => void;
  disabled?: boolean;
}

const EmojiStickerButton = ({ inputRef, value, onChange, onSticker, disabled = false }: EmojiStickerButtonProps) => {
  const { translations } = useLanguage();
  const [open, setOpen] = useState(false);

  const addEmoji = (emoji: string) => {
    const field = inputRef.current;
    const next = insertAtCursor(value, emoji, field?.selectionStart ?? value.length, field?.selectionEnd ?? value.length);
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
        <button type="button" disabled={disabled} aria-label={translations.emojiAndStickers} data-testid="emoji-sticker-button"
          className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} collisionPadding={12} sticky="always" onOpenAutoFocus={(event) => event.preventDefault()}
        className="h-[min(24rem,55dvh)] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0">
        <Tabs defaultValue={onSticker ? 'stickers' : 'emoji'} className="flex h-full flex-col">
          <TabsList className="m-2 grid shrink-0 grid-cols-2">
            <TabsTrigger value="emoji">{translations.emojiTab}</TabsTrigger>
            <TabsTrigger value="stickers" disabled={!onSticker}>{translations.stickersTab}</TabsTrigger>
          </TabsList>
          <TabsContent value="emoji" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            {EMOJI_SETS.map((set) => (
              <section key={set.label} className="px-3 pb-2">
                <h3 className="sticky top-0 z-10 bg-popover py-1.5 text-xs font-medium text-muted-foreground">{translations[set.label]}</h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {set.emoji.map((emoji) => (
                    <button key={emoji} type="button" aria-label={emoji} onClick={() => addEmoji(emoji)}
                      className="flex aspect-square items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-accent">
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </TabsContent>
          <TabsContent value="stickers" className="mt-0 min-h-0 flex-1">
            {onSticker && <StickerTab onPick={(sticker) => { onSticker(sticker); setOpen(false); }} onManage={() => { setOpen(false); openStickerPacks(); }} />}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiStickerButton;
