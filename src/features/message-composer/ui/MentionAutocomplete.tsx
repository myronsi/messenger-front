import { useEffect, useRef, useState, type RefObject } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useCurrentUsername } from '@/shared/contexts/CurrentUsernameContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { cn } from '@/shared/lib/utils';
import { applyMention, mentionQuery, suggestMentions, type MentionCandidate } from '../model/mentionAutocomplete';

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  members: MentionCandidate[];
  canMentionAll: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const MentionAutocomplete = ({ inputRef, members, canMentionAll, value, onChange, className }: Props) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const self = useCurrentUsername();
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [caretState, setCaret] = useState<number | null>(null);
  const caret = Math.min(caretState ?? value.length, value.length);
  const at = mentionQuery(value, caret);
  const key = at ? `${at.start}:${at.query}` : null;
  const suggestions = at && key !== dismissed ? suggestMentions(members, at.query, self, canMentionAll) : [];
  const state = useRef({ suggestions, active, at, value, caret });
  state.current = { suggestions, active, at, value, caret };

  useEffect(() => setActive(0), [key]);

  const select = (index: number) => {
    const { suggestions: list, at: query, value: text, caret: position } = state.current;
    const member = list[index];
    if (!member || !query) return;
    const next = applyMention(text, position, query, member.username);
    setCaret(next.caret);
    onChange(next.value);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(next.caret, next.caret));
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return undefined;
    const element: HTMLElement = field;
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
    element.addEventListener('keydown', onKey);
    events.forEach((name) => element.addEventListener(name, track));
    return () => {
      element.removeEventListener('keydown', onKey);
      events.forEach((name) => element.removeEventListener(name, track));
    };
  }, [inputRef]);

  if (!suggestions.length) return null;
  return (
    <div role="listbox" aria-label={t.mentionSuggestions} data-testid="mention-suggestions"
      className={cn('absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg', className)}>
      {suggestions.map((member, index) => (
        <button key={member.username} type="button" role="option" aria-selected={index === active}
          onMouseDown={(event) => { event.preventDefault(); select(index); }}
          className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm', index === active ? 'bg-accent' : 'hover:bg-accent')}>
          {member.all
            ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Users className="h-4 w-4" /></span>
            : <AuthenticatedImage src={resolveMediaUrl(member.avatar_url)} initialsFrom={member.display_name || member.username} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{member.all ? t.mentionAll : member.display_name || member.username}</span>
            <span className="block truncate text-xs text-muted-foreground">@{member.username}</span>
          </span>
        </button>
      ))}
    </div>
  );
};
