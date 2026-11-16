import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { emojiToken } from '@/shared/lib/customEmoji';
import { rememberEmoji, useEmojiPacks } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { cn } from '@/shared/lib/utils';
import { applySuggestion, shortcodeQuery, suggestEmoji } from '../model/emojiAutocomplete';

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export const EmojiAutocomplete = ({ inputRef, value, onChange }: Props) => {
  const { translations } = useLanguage();
  const packs = useEmojiPacks();
  const all = useMemo(() => packs.filter((pack) => !pack.is_hidden || pack.is_mine).flatMap((pack) => pack.emoji), [packs]);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [caretState, setCaret] = useState<number | null>(null);
  const caret = Math.min(caretState ?? value.length, value.length);
  const at = shortcodeQuery(value, caret);
  const key = at ? `${at.start}:${at.query}` : null;
  const suggestions = at && key !== dismissed ? suggestEmoji(all, at.query) : [];
  const state = useRef({ suggestions, active, at, value, caret });
  state.current = { suggestions, active, at, value, caret };

  useEffect(() => setActive(0), [key]);

  const select = (index: number) => {
    const { suggestions: list, at: query, value: text, caret: position } = state.current;
    const emoji = list[index];
    if (!emoji || !query) return;
    const next = applySuggestion(text, position, query, emoji.shortcode);
    rememberEmoji(emojiToken(emoji));
    setCaret(next.caret);
    onChange(next.value);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(next.caret, next.caret));
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const { suggestions: list, active: index } = state.current;
      if (!list.length || event.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        setActive((index + (event.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        selectRef.current(index);
      } else if (event.key === 'Escape') {
        setDismissed(state.current.at ? `${state.current.at.start}:${state.current.at.query}` : null);
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const track = () => setCaret(field.selectionStart);
    const events = ['input', 'change', 'keyup', 'click', 'select'] as const;
    field.addEventListener('keydown', onKey);
    events.forEach((name) => field.addEventListener(name, track));
    return () => {
      field.removeEventListener('keydown', onKey);
      events.forEach((name) => field.removeEventListener(name, track));
    };
  }, [inputRef]);

  if (!suggestions.length) return null;
  return (
    <div role="listbox" aria-label={translations.customEmoji.suggestions} data-testid="emoji-suggestions"
      className="absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
      {suggestions.map((emoji, index) => (
        <button key={emoji.id} type="button" role="option" aria-selected={index === active}
          onMouseDown={(event) => { event.preventDefault(); select(index); }}
          className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm', index === active ? 'bg-accent' : 'hover:bg-accent')}>
          <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-6 w-6" />
          <span className="truncate">:{emoji.shortcode}:</span>
        </button>
      ))}
    </div>
  );
};
