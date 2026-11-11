import { useCallback, useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, Smile } from 'lucide-react';
import type { Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { focusComposer, isMobileComposer, keyboardInset, lastKeyboardHeight } from '@/shared/lib/composerFocus';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { insertAtCursor } from '../model/insertAtCursor';
import { DockedEmojiPanel } from './DockedEmojiPanel';
import { DOCK_GAP } from '../model/dockLayout';
import { EmojiStickerPanel } from './EmojiStickerPanel';

interface EmojiStickerButtonProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSticker?: (sticker: Sticker) => void;
  disabled?: boolean;
  dock?: HTMLElement | null;
}

const KEYBOARD_WAIT_MS = 1000;
const COLLAPSE_MS = 220;

const BUTTON_CLASS = 'motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50';

export const dockedPanelHeight = () => (lastKeyboardHeight() ?? Math.round(Math.min(360, Math.max(240, window.innerHeight * 0.4)))) - DOCK_GAP;

const EmojiStickerButton = ({ inputRef, value, onChange, onSticker, disabled = false, dock }: EmojiStickerButtonProps) => {
  const { translations } = useLanguage();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<{ height: number; leaving: boolean; closing?: boolean } | null>(null);
  const docked = !!panel && !panel.leaving && !panel.closing;
  const closeDock = useCallback(() => setPanel(null), []);
  const collapseDock = useCallback(() => setPanel((current) => (current && { ...current, closing: true })), []);

  useEffect(() => {
    if (!panel?.closing) return undefined;
    const timer = setTimeout(closeDock, COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [panel?.closing, closeDock]);
  const giveWayToKeyboard = useCallback(() => setPanel((current) => (current && { ...current, leaving: true })), []);

  useEffect(() => {
    const field = inputRef.current;
    if (!docked || !field) return undefined;
    field.addEventListener('focus', giveWayToKeyboard);
    return () => field.removeEventListener('focus', giveWayToKeyboard);
  }, [docked, inputRef, giveWayToKeyboard]);

  const leavingHeight = panel?.leaving ? panel.height : null;
  useEffect(() => {
    if (leavingHeight === null) return undefined;
    const viewport = window.visualViewport;
    const covered = Math.min(leavingHeight, lastKeyboardHeight() ?? leavingHeight) - 1;
    const finish = () => { if (keyboardInset() >= covered) closeDock(); };
    viewport?.addEventListener('resize', finish);
    const timer = setTimeout(collapseDock, KEYBOARD_WAIT_MS);
    return () => {
      viewport?.removeEventListener('resize', finish);
      clearTimeout(timer);
    };
  }, [leavingHeight, closeDock, collapseDock]);

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

  if (dock && isMobileComposer()) {
    const toggleDock = () => {
      if (docked) {
        giveWayToKeyboard();
        focusComposer(inputRef.current);
        return;
      }
      setPanel({ height: dockedPanelHeight(), leaving: false });
      inputRef.current?.blur();
    };
    return (
      <>
        <button type="button" disabled={disabled} aria-label={translations.emojiAndStickers} aria-expanded={docked} data-testid="emoji-sticker-button"
          className={BUTTON_CLASS} onClick={toggleDock}>
          {docked ? <Keyboard className="h-5 w-5" /> : <Smile className="h-5 w-5" />}
        </button>
        {panel && createPortal(
          <DockedEmojiPanel key={panel.height} baseHeight={panel.height} onClose={collapseDock} leaving={panel.leaving} closing={panel.closing}>
            <EmojiStickerPanel onEmoji={addEmoji} onSticker={onSticker} onDone={collapseDock} />
          </DockedEmojiPanel>,
          dock,
        )}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label={translations.emojiAndStickers} data-testid="emoji-sticker-button" className={BUTTON_CLASS}>
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} collisionPadding={12} sticky="always" onOpenAutoFocus={(event) => event.preventDefault()}
        className="h-[min(24rem,55dvh)] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0">
        <EmojiStickerPanel onEmoji={addEmoji} onSticker={onSticker} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiStickerButton;
