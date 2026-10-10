import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSearchMessagesInfiniteQuery } from '@/entities/message';
import type { MessageSearchHit } from '@/entities/message';
import { useSearchUsersQuery } from '@/entities/user';
import type { User } from '@/entities/user';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const PEOPLE_SHOWN = 5;

export type GlobalSearchItem =
  | { kind: 'user'; key: string; user: User }
  | { kind: 'message'; key: string; hit: MessageSearchHit };

interface UseGlobalSearchOptions {
  onOpenUser: (user: User) => void;
  onOpenMessage: (hit: MessageSearchHit) => void;
  onClose: () => void;
}

// State of the sidebar search: the debounced query, people and message results (messages page by page), and
// keyboard navigation over both lists as one.
export function useGlobalSearch({ onOpenUser, onOpenMessage, onClose }: UseGlobalSearchOptions) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const skip = query.length < MIN_QUERY_LENGTH;
  // A new query replaces the previous one; RTK Query drops the answers of the old arguments.
  const users = useSearchUsersQuery(query, { skip });
  const messages = useSearchMessagesInfiniteQuery({ q: query }, { skip });

  const people = useMemo(() => (skip ? [] : (users.data?.users ?? []).slice(0, PEOPLE_SHOWN)), [skip, users.data]);
  const hits = useMemo(() => (skip ? [] : (messages.data?.pages ?? []).flatMap((page) => page.hits)), [skip, messages.data]);

  const items = useMemo<GlobalSearchItem[]>(() => [
    ...people.map((user) => ({ kind: 'user' as const, key: `user-${user.id}`, user })),
    ...hits.map((hit) => ({ kind: 'message' as const, key: `message-${hit.id}`, hit })),
  ], [people, hits]);

  const openItem = (item: GlobalSearchItem) => {
    if (item.kind === 'user') onOpenUser(item.user);
    else onOpenMessage(item.hit);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown' && items.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp' && items.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault();
      openItem(items[activeIndex]);
    }
  };

  const loadMore = () => {
    if (messages.hasNextPage && !messages.isFetchingNextPage && !messages.isError) void messages.fetchNextPage();
  };

  return {
    input,
    setInput,
    query,
    isTooShort: input.trim().length > 0 && input.trim().length < MIN_QUERY_LENGTH,
    people,
    hits,
    items,
    activeIndex,
    setActiveIndex,
    openItem,
    onKeyDown,
    loadMore,
    hasMore: Boolean(messages.hasNextPage),
    // Waiting for the debounce counts as loading, so "No results" never shows for the previous query.
    isLoading: (!skip && (users.isFetching || (messages.isFetching && !messages.isFetchingNextPage))) || input.trim() !== query,
    isLoadingMore: messages.isFetchingNextPage,
    isError: !skip && (users.isError || messages.isError),
    retry: () => {
      void users.refetch();
      void messages.refetch();
    },
  };
}
