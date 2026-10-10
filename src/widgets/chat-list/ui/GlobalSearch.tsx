import React, { useEffect, useRef } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Chat, MessageSearchHit } from '@/entities/message';
import type { User } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { formatDateOnly, formatTime, parseUtcDate } from '@/shared/utils/dateFormatters';
import HighlightedText from '@/shared/ui/HighlightedText';
import MediaImg from '@/shared/ui/MediaImg';
import { useGlobalSearch } from '../model/useGlobalSearch';
import type { Id } from '@/shared/lib/ids';

interface GlobalSearchProps {
  translations: Translations;
  currentUsername: string;
  chatsById: Record<Id, Chat>;
  onOpenUser: (user: User) => void;
  onOpenMessage: (hit: MessageSearchHit) => void;
  onClose: () => void;
}

const isToday = (timestamp: string) => parseUtcDate(timestamp).toDateString() === new Date().toDateString();

const rowClass = (active: boolean) => `flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
  active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
}`;

// The sidebar search: people and messages of all the user's chats, with keyboard navigation (up/down, Enter
// opens, Escape closes) and more messages loaded on scroll.
const GlobalSearch: React.FC<GlobalSearchProps> = ({ translations, currentUsername, chatsById, onOpenUser, onOpenMessage, onClose }) => {
  const { language } = useLanguage();
  const search = useGlobalSearch({ onOpenUser, onOpenMessage, onClose });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const loadMoreRef = useRef(search.loadMore);
  loadMoreRef.current = search.loadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !search.hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [search.hasMore, search.hits.length]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [search.activeIndex]);

  const formatWhen = (timestamp: string) => (isToday(timestamp) ? formatTime(timestamp, language) : formatDateOnly(timestamp, language));
  const chatTitle = (chatId: Id) => {
    const chat = chatsById[chatId];
    return chat ? chat.display_name || chat.name : '';
  };
  const hasQuery = search.query.length >= 2;
  const isEmpty = hasQuery && !search.isLoading && !search.isError && search.items.length === 0;

  return (
    <div className="flex min-h-0 flex-col gap-3" onKeyDown={search.onKeyDown}>
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={search.items.length > 0}
          aria-controls="global-search-results"
          aria-activedescendant={search.items[search.activeIndex]?.key}
          placeholder={translations.searchPeopleAndMessages}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={search.input}
          onChange={(event) => search.setInput(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
        />
        {search.isLoading && hasQuery && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {search.isTooShort && <p className="px-1 text-sm text-muted-foreground">{translations.searchMinChars}</p>}
      {search.isError && (
        <p className="px-1 text-sm text-destructive">
          {translations.searchFailed}{' '}
          <button type="button" className="underline" onClick={search.retry}>{translations.searchRetry}</button>
        </p>
      )}
      {isEmpty && <p className="px-1 text-sm text-muted-foreground">{translations.noSearchResults}</p>}

      <div id="global-search-results" role="listbox" className="flex flex-col gap-1">
        {search.items.map((item, index) => {
          const active = index === search.activeIndex;
          const isFirstOfKind = index === 0 || search.items[index - 1].kind !== item.kind;
          const heading = isFirstOfKind && (
            <h4 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.kind === 'user' ? translations.searchPeople : translations.searchMessageResults}
            </h4>
          );

          if (item.kind === 'user') {
            const isSelf = item.user.username.toLowerCase() === currentUsername.toLowerCase();
            return (
              <React.Fragment key={item.key}>
                {heading}
                <button
                  id={item.key}
                  ref={active ? activeRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={isSelf}
                  data-testid="user-search-result"
                  data-username={item.user.username}
                  onClick={() => search.openItem(item)}
                  onMouseEnter={() => search.setActiveIndex(index)}
                  className={`${rowClass(active)} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <MediaImg src={resolveMediaUrl(item.user.avatar_url, DEFAULT_AVATAR)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.user.display_name || item.user.username}</span>
                    <span className="block truncate text-sm text-muted-foreground">@{item.user.username}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          }

          const { hit } = item;
          return (
            <React.Fragment key={item.key}>
              {heading}
              <button
                id={item.key}
                ref={active ? activeRef : undefined}
                type="button"
                role="option"
                aria-selected={active}
                data-testid="message-search-result"
                onClick={() => search.openItem(item)}
                onMouseEnter={() => search.setActiveIndex(index)}
                className={`${rowClass(active)} items-start`}
              >
                <MediaImg src={resolveMediaUrl(hit.avatarUrl, DEFAULT_AVATAR)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{chatTitle(hit.chatId) || hit.senderName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(hit.timestamp)}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{hit.senderName}</span>
                  <HighlightedText excerpt={hit.highlight ?? hit.text} className="line-clamp-2 text-sm text-muted-foreground" />
                </span>
              </button>
            </React.Fragment>
          );
        })}
        {search.hasMore && <div ref={sentinelRef} className="h-1" aria-hidden />}
        {search.isLoadingMore && <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
};

export default GlobalSearch;
