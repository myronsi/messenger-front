import { useState, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Chat } from '@/entities/message';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { AppLanguage } from '@/shared/lang/languages';
import { formatDateOnly } from '@/shared/utils/dateFormatters';
import { SEARCH_TYPES, type PickedValue, type SearchFilterState } from '../model/searchFilters';
import { matchingChats } from '../model/hitDisplay';

interface SearchFilterChipsProps {
  value: SearchFilterState;
  onChange: (next: SearchFilterState) => void;
  chats: Chat[];
  senders: PickedValue[];
  currentUserId?: string;
  translations: Translations;
  language: AppLanguage;
}

type ChipName = 'chat' | 'sender' | 'type' | 'date';

const optionClass = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground';

interface ChipProps {
  name: ChipName;
  label: string;
  active: string;
  open: boolean;
  setOpen: (name: ChipName | null) => void;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}

const Chip = ({ name, label, active, open, setOpen, clearLabel, onClear, children }: ChipProps) => (
  <Popover open={open} onOpenChange={(next) => setOpen(next ? name : null)}>
    <span data-testid={`global-search-filter-${name}`} className={`flex shrink-0 items-center rounded-full border text-sm ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
      <PopoverTrigger asChild>
        <button type="button" className="flex max-w-[12rem] items-center gap-1 py-1 pl-3 pr-2">
          <span className="truncate">{active ? <EmojiText text={active} /> : label}</span>
          {!active && <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        </button>
      </PopoverTrigger>
      {active && (
        <button type="button" aria-label={`${clearLabel}: ${label}`} onClick={onClear} className="mr-1 rounded-full p-0.5 hover:bg-primary/15">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
    <PopoverContent align="start" className="z-[70] max-h-80 w-64 overflow-auto p-1.5">{children}</PopoverContent>
  </Popover>
);

interface DateRangeProps {
  value: SearchFilterState;
  onApply: (from?: string, to?: string) => void;
  translations: Translations;
}

const DateRange = ({ value, onApply, translations }: DateRangeProps) => {
  const [from, setFrom] = useState(value.fromDate ?? '');
  const [to, setTo] = useState(value.toDate ?? '');
  const t = translations.globalSearch.filters;
  const inputClass = 'w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground';
  return (
    <div className="flex flex-col gap-2 p-1.5">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">{t.dateFrom}
        <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">{t.dateTo}
        <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={inputClass} />
      </label>
      <button type="button" onClick={() => onApply(from || undefined, to || undefined)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t.apply}</button>
    </div>
  );
};

export const SearchFilterChips = ({ value, onChange, chats, senders, currentUserId, translations, language }: SearchFilterChipsProps) => {
  const [open, setOpen] = useState<ChipName | null>(null);
  const [chatQuery, setChatQuery] = useState('');
  const t = translations.globalSearch.filters;
  const pick = (next: SearchFilterState) => {
    onChange(next);
    setOpen(null);
  };
  const chatOptions = chatQuery.trim() ? matchingChats(chats, chatQuery, translations) : chats.filter((chat) => !chat.is_request).slice(0, 50);
  const people = currentUserId ? [{ id: currentUserId, name: t.me }, ...senders] : senders;
  const dateLabel = [value.fromDate, value.toDate].map((day) => (day ? formatDateOnly(`${day}T12:00:00`, language) : '…')).join(' – ');
  const shared = { setOpen, clearLabel: t.clear };

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      <Chip {...shared} name="chat" label={t.inChat} active={value.chat?.name ?? ''} open={open === 'chat'}
        onClear={() => onChange({ ...value, chat: undefined })}>
        <input value={chatQuery} onChange={(event) => setChatQuery(event.target.value)} placeholder={t.searchChats} autoComplete="off"
          className="mb-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" />
        {chatOptions.length ? chatOptions.map((chat) => (
          <button type="button" key={String(chat.id)} className={optionClass}
            onClick={() => pick({ ...value, chat: { id: String(chat.id), name: chat.display_name || chat.name } })}>
            <AuthenticatedImage src={chat.avatar_url} fallbackSrc={chat.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR}
              initialsFrom={chat.display_name || chat.name} alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover" />
            <span className="truncate"><EmojiText text={chat.display_name || chat.name} /></span>
          </button>
        )) : <p className="px-2 py-1.5 text-sm text-muted-foreground">{t.noChats}</p>}
      </Chip>
      <Chip {...shared} name="sender" label={t.from} active={value.sender?.name ?? ''} open={open === 'sender'}
        onClear={() => onChange({ ...value, sender: undefined })}>
        {people.map((person) => (
          <button type="button" key={person.id} className={optionClass} onClick={() => pick({ ...value, sender: person })}>
            <span className="truncate"><EmojiText text={person.name} /></span>
          </button>
        ))}
        {!senders.length && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.noPeople}</p>}
      </Chip>
      <Chip {...shared} name="type" label={t.type} active={value.type ? translations.globalSearch.types[value.type] : ''} open={open === 'type'}
        onClear={() => onChange({ ...value, type: undefined })}>
        {SEARCH_TYPES.map((type) => (
          <button type="button" key={type} className={optionClass} onClick={() => pick({ ...value, type })}>{translations.globalSearch.types[type]}</button>
        ))}
      </Chip>
      <Chip {...shared} name="date" label={t.date} active={value.fromDate || value.toDate ? dateLabel : ''} open={open === 'date'}
        onClear={() => onChange({ ...value, fromDate: undefined, toDate: undefined })}>
        <DateRange value={value} translations={translations} onApply={(fromDate, toDate) => pick({ ...value, fromDate, toDate })} />
      </Chip>
    </div>
  );
};
