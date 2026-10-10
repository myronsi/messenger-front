import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSearchMessagesInfiniteQuery } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';
import { EMPTY_FILTERS, toSearchArgs } from './filters';
import type { ChatSearchFilters } from './filters';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface UseChatSearchOptions {
  chatId: Id;
  onJump: (messageId: Id) => void;
  onClose: () => void;
}

// The search in one chat: query and filters, the results newest first, and the current result. Going to an
// older result past the loaded ones loads the next page first.
export function useChatSearch({ chatId, onJump, onClose }: UseChatSearchOptions) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ChatSearchFilters>(EMPTY_FILTERS);
  const [index, setIndex] = useState(-1);
  const pendingOlderRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const skip = query.length < MIN_QUERY_LENGTH;
  const args = useMemo(() => toSearchArgs(chatId, query, filters), [chatId, query, filters]);
  const search = useSearchMessagesInfiniteQuery(args, { skip });
  const hits = useMemo(() => (skip ? [] : (search.data?.pages ?? []).flatMap((page) => page.hits)), [skip, search.data]);

  useEffect(() => {
    setIndex(-1);
    pendingOlderRef.current = false;
  }, [args]);

  const goTo = (next: number) => {
    const hit = hits[next];
    if (!hit) return;
    setIndex(next);
    onJump(hit.id);
  };

  // The next page arrived after "older" was pressed on the last loaded result.
  useEffect(() => {
    if (!pendingOlderRef.current || search.isFetchingNextPage) return;
    pendingOlderRef.current = false;
    if (index + 1 < hits.length) goTo(index + 1);
  }, [hits.length, search.isFetchingNextPage]);

  const older = () => {
    if (index + 1 < hits.length) {
      goTo(index + 1);
    } else if (search.hasNextPage && !search.isFetchingNextPage) {
      pendingOlderRef.current = true;
      void search.fetchNextPage();
    }
  };

  const newer = () => {
    if (index > 0) goTo(index - 1);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter' || (event.key === 'ArrowUp' && event.altKey)) {
      event.preventDefault();
      if (event.shiftKey) newer();
      else older();
    } else if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault();
      newer();
    }
  };

  const loadMore = () => {
    if (search.hasNextPage && !search.isFetchingNextPage && !search.isError) void search.fetchNextPage();
  };

  const hasMore = Boolean(search.hasNextPage);
  return {
    input,
    setInput,
    filters,
    setFilters,
    hits,
    index,
    goTo,
    older,
    newer,
    canGoOlder: index + 1 < hits.length || hasMore,
    canGoNewer: index > 0,
    onKeyDown,
    loadMore,
    hasMore,
    hasQuery: !skip,
    // "3 / 20+": the current result of the loaded ones; "+" while there are more pages.
    counter: hits.length === 0 ? '' : `${index >= 0 ? `${index + 1} / ` : ''}${hits.length}${hasMore ? '+' : ''}`,
    isLoading: (!skip && search.isFetching && !search.isFetchingNextPage) || input.trim() !== query,
    isLoadingMore: search.isFetchingNextPage,
    isError: !skip && search.isError,
    retry: () => {
      void search.refetch();
    },
  };
}
