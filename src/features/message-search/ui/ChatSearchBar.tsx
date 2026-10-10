import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, List, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import HighlightedText from '@/shared/ui/HighlightedText';
import { formatDateOnly, formatTime } from '@/shared/utils/dateFormatters';
import type { Id } from '@/shared/lib/ids';
import { hasFilters } from '../model/filters';
import type { ChatSearchFilters } from '../model/filters';
import { useChatSearch } from '../model/useChatSearch';

export interface ChatSearchSender {
  id: Id;
  name: string;
}

interface ChatSearchBarProps {
  chatId: Id;
  // The people whose messages can be filtered by, e.g. the two users of a direct chat or the group members.
  senders: ChatSearchSender[];
  onJumpToMessage: (messageId: Id) => void;
  onClose: () => void;
}

const fieldClass = 'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring';
const iconButtonClass = 'rounded-full p-1.5 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40';

// The search panel of a chat, under its header: query, previous/next result, filters (sender, type, days)
// and an optional list of the results.
const ChatSearchBar: React.FC<ChatSearchBarProps> = ({ chatId, senders, onJumpToMessage, onClose }) => {
  const { translations, language } = useLanguage();
  const search = useChatSearch({ chatId, onJump: onJumpToMessage, onClose });
  const [showFilters, setShowFilters] = useState(false);
  const [showList, setShowList] = useState(false);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const loadMoreRef = useRef(search.loadMore);
  loadMoreRef.current = search.loadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !showList || !search.hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showList, search.hasMore, search.hits.length]);

  const setFilter = <K extends keyof ChatSearchFilters>(key: K, value: ChatSearchFilters[K]) => {
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  };
  const formatWhen = (timestamp: string) => `${formatDateOnly(timestamp, language)} ${formatTime(timestamp, language)}`;
  const isEmpty = search.hasQuery && !search.isLoading && !search.isError && search.hits.length === 0;

  return (
    <div className="border-b border-border bg-background px-3 py-2" data-testid="chat-search-bar">
      <div className="flex items-center gap-1">
        <Search className="mx-1 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={search.input}
          onChange={(event) => search.setInput(event.target.value)}
          onKeyDown={search.onKeyDown}
          placeholder={translations.searchInChat}
          aria-label={translations.searchInChat}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
        />
        {search.isLoading && search.hasQuery && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground" aria-live="polite">{search.counter}</span>
        <button type="button" onClick={search.older} disabled={!search.canGoOlder} aria-label={translations.searchOlderResult} className={iconButtonClass}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" onClick={search.newer} disabled={!search.canGoNewer} aria-label={translations.searchNewerResult} className={iconButtonClass}>
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowList((open) => !open)}
          aria-pressed={showList}
          aria-label={translations.searchShowResults}
          className={`${iconButtonClass} ${showList ? 'bg-accent' : ''}`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-pressed={showFilters}
          aria-label={translations.searchFilters}
          className={`${iconButtonClass} relative ${showFilters ? 'bg-accent' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasFilters(search.filters) && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
        <button type="button" onClick={onClose} aria-label={translations.closeSearch} className={iconButtonClass}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {showFilters && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {translations.searchSender}
            <select value={search.filters.senderId ?? ''} onChange={(event) => setFilter('senderId', event.target.value || null)} className={fieldClass}>
              <option value="">{translations.searchAnyone}</option>
              {senders.map((sender) => <option key={sender.id} value={sender.id}>{sender.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {translations.searchType}
            <select
              value={search.filters.type ?? ''}
              onChange={(event) => setFilter('type', (event.target.value || null) as ChatSearchFilters['type'])}
              className={fieldClass}
            >
              <option value="">{translations.searchAllTypes}</option>
              <option value="text">{translations.searchTypeText}</option>
              <option value="file">{translations.searchTypeFiles}</option>
              <option value="voice">{translations.searchTypeVoice}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {translations.searchFrom}
            <input type="date" value={search.filters.fromDate} max={search.filters.toDate || undefined} onChange={(event) => setFilter('fromDate', event.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {translations.searchTo}
            <input type="date" value={search.filters.toDate} min={search.filters.fromDate || undefined} onChange={(event) => setFilter('toDate', event.target.value)} className={fieldClass} />
          </label>
        </div>
      )}

      {search.isError && (
        <p className="mt-2 text-sm text-destructive">
          {translations.searchFailed}{' '}
          <button type="button" className="underline" onClick={search.retry}>{translations.searchRetry}</button>
        </p>
      )}
      {isEmpty && <p className="mt-2 text-sm text-muted-foreground">{translations.noSearchResults}</p>}

      {showList && search.hits.length > 0 && (
        <ul className="mt-2 max-h-[40vh] overflow-y-auto rounded-md border border-border" role="listbox" aria-label={translations.searchMessageResults}>
          {search.hits.map((hit, position) => (
            <li key={hit.id} role="option" aria-selected={position === search.index}>
              <button
                type="button"
                onClick={() => search.goTo(position)}
                className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-accent ${
                  position === search.index ? 'bg-accent' : ''
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{hit.senderName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(hit.timestamp)}</span>
                </span>
                <HighlightedText excerpt={hit.highlight ?? hit.text} className="line-clamp-2 text-sm text-muted-foreground" />
              </button>
            </li>
          ))}
          {search.hasMore && <li ref={sentinelRef} className="h-1" aria-hidden />}
          {search.isLoadingMore && <li className="py-2"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></li>}
        </ul>
      )}
    </div>
  );
};

export default ChatSearchBar;
