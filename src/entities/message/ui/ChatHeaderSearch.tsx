import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, List, Loader2, Search, X } from 'lucide-react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { setSearchHighlight } from '@/shared/lib/searchHighlight';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useSearchChatMessagesQuery } from '../api/messageApi';
import { ChatSearchResultsList } from './ChatSearchResultsList';

const DEBOUNCE_MS = 250;

interface ChatHeaderSearchProps {
  chatId: EntityId;
  onClose: () => void;
  onJumpToMessage: (messageId: EntityId) => void;
}

const ChatHeaderSearch: React.FC<ChatHeaderSearchProps> = ({ chatId, onClose, onJumpToMessage }) => {
  const { translations } = useLanguage();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [index, setIndex] = useState(0);
  const [showList, setShowList] = useState(false);
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const jumpRef = useRef(onJumpToMessage);
  jumpRef.current = onJumpToMessage;
  const { currentData, isFetching, error } = useSearchChatMessagesQuery({ chatId, query: searched }, { skip: !isPersistedId(chatId) || !searched });
  const results = searched ? currentData?.results ?? [] : [];
  const total = results.length;

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => setSearchHighlight(''), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearched(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setSearchHighlight(searched);
    setIndex(0);
  }, [searched]);
  const first = results[0]?.id;
  useEffect(() => {
    if (first === undefined) return;
    setIndex(0);
    jumpRef.current(first);
  }, [first, searched]);

  const select = (next: number) => {
    setIndex(next);
    jumpRef.current(results[next].id);
  };

  const go = (step: 1 | -1) => {
    if (!total) return;
    const next = Math.min(Math.max(index + step, 0), total - 1);
    if (next !== index) select(next);
  };

  const status = !searched ? '' : error ? translations.errorLoadingMessages || 'Error'
    : total ? `${index + 1} / ${total}` : isFetching ? '' : translations.noSearchResults || 'No results';
  const navButton = 'motion-press shrink-0 rounded-full p-2 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30';

  return (
    <div data-testid="chat-header-search" className="motion-panel-in relative z-[60] flex h-[72px] shrink-0 items-center gap-1 border-b border-border bg-background px-4 sm:px-6">
      {showList && total > 0 && (
        <ChatSearchResultsList results={results} query={searched} activeIndex={index}
          onSelect={(next) => { select(next); if (isMobile) setShowList(false); }} />
      )}
      <div className="mr-1 flex min-w-0 flex-1 items-center gap-2 rounded-full bg-accent px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { if (showList && total) setShowList(false); else onClose(); }
            else if (event.key === 'Enter') { event.preventDefault(); go(event.shiftKey ? -1 : 1); }
          }}
          placeholder={translations.searchInChat || 'Search in chat'}
          aria-label={translations.searchInChat || 'Search in chat'}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        {status && <span data-testid="chat-search-status" aria-live="polite" className="shrink-0 text-xs tabular-nums text-muted-foreground">{status}</span>}
      </div>
      <button type="button" onClick={() => setShowList((open) => !open)} disabled={!total} aria-pressed={showList}
        aria-label={translations.searchResultsList} title={translations.searchResultsList} className={`${navButton} ${showList ? 'bg-accent' : ''}`}>
        <List className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(1)} disabled={index >= total - 1} aria-label={translations.olderSearchResult} className={navButton}>
        <ChevronUp className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(-1)} disabled={index <= 0} aria-label={translations.newerSearchResult} className={navButton}>
        <ChevronDown className="h-5 w-5" />
      </button>
      <button type="button" onClick={onClose} aria-label={translations.close || 'Close'} className="motion-press shrink-0 rounded-full p-2 transition-colors hover:bg-accent">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ChatHeaderSearch;
