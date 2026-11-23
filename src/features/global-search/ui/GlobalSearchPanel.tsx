import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { Search, X } from 'lucide-react';
import type { Chat, GlobalSearchHit } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { AppLanguage } from '@/shared/lang/languages';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useGlobalSearch } from '../model/useGlobalSearch';
import { useRecentSearches } from '../model/recentSearches';
import { SEARCH_TABS, TAB_KIND, sendersOf, toApiFilters, type SearchFilterState, type SearchTab } from '../model/searchFilters';
import { SearchFilterChips } from './SearchFilterChips';
import { SearchResults } from './SearchResults';
import type { HitContext } from '../model/hitDisplay';

const LOAD_MORE_EDGE = 240;

export interface GlobalSearchPanelProps {
  chats: Chat[];
  currentUserId?: string;
  currentUsername: string;
  translations: Translations;
  language: AppLanguage;
  onOpenChat: (chat: Chat) => void;
  onOpenUser: (username: string) => void;
  onOpenHit: (hit: GlobalSearchHit) => void;
  onClose: () => void;
}

const useEscapeToClose = (onClose: () => void) => {
  const closeRef = useLatestRef(onClose);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeRef]);
};

export const GlobalSearchPanel = (props: GlobalSearchPanelProps) => {
  const { chats, currentUserId, currentUsername, translations, language, onOpenChat, onOpenUser, onOpenHit, onClose } = props;
  const t = translations.globalSearch;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [filterState, setFilterState] = useState<SearchFilterState>({});
  const filters = useMemo(() => toApiFilters(filterState), [filterState]);
  const search = useGlobalSearch({ query, kind: TAB_KIND[tab], filters });
  const recent = useRecentSearches();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  useEscapeToClose(onClose);
  const chatsById = useMemo(() => new Map(chats.map((chat) => [String(chat.id), chat])), [chats]);
  const senders = useMemo(() => {
    const seen = sendersOf(search.hits, currentUserId);
    const picked = filterState.sender;
    return picked && picked.id !== currentUserId && !seen.some((person) => person.id === picked.id) ? [picked, ...seen] : seen;
  }, [currentUserId, filterState.sender, search.hits]);
  const context: HitContext = {
    chatsById, currentUserId, query, language, translations,
    onOpen: (hit) => {
      recent.remember(query);
      onOpenHit(hit);
    },
  };
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const box = event.currentTarget;
    if (tab !== 'all' && box.scrollTop + box.clientHeight >= box.scrollHeight - LOAD_MORE_EDGE) search.loadMore();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input ref={input} type="search" value={query} placeholder={t.placeholder} aria-label={t.placeholder}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" data-testid="global-search-input"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') recent.remember(query); }}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden" />
          {query && (
            <button type="button" aria-label={t.clearQuery} onClick={() => setQuery('')} className="rounded-full p-0.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button type="button" onClick={onClose} className="shrink-0 rounded-full px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent">
          {translations.cancel}
        </button>
      </div>
      <div role="tablist" aria-label={translations.search} className="flex gap-1 overflow-x-auto border-b border-border px-3 [scrollbar-width:none]">
        {SEARCH_TABS.map((name) => (
          <button type="button" role="tab" key={name} aria-selected={tab === name} data-testid={`global-search-tab-button-${name}`}
            onClick={() => setTab(name)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === name ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.tabs[name]}
          </button>
        ))}
      </div>
      <div className="pt-2">
        <SearchFilterChips value={filterState} onChange={setFilterState} chats={chats} senders={senders} currentUserId={currentUserId}
          translations={translations} language={language} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4" onScroll={onScroll} data-testid="global-search-results">
        <SearchResults tab={tab} search={search} chats={chats} currentUsername={currentUsername} context={context}
          recent={recent.items} onPickRecent={setQuery} onClearRecent={recent.clear} onTab={setTab}
          onOpenChat={(chat) => { recent.remember(query); onOpenChat(chat); }}
          onOpenUser={(username) => { recent.remember(query); onOpenUser(username); }} />
      </div>
    </div>
  );
};
