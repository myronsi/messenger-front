import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isUnreachable, searchMessagesLocal, searchMessagesRemote,
  type GlobalSearchArgs, type GlobalSearchFilters, type GlobalSearchHit, type GlobalSearchKind,
} from '@/entities/message';
import { isOffline } from '@/shared/lib/network';
import { mergeHits } from './searchHits';

export const SEARCH_DEBOUNCE_MS = 250;

interface SearchState {
  key: string;
  local: GlobalSearchHit[];
  server: GlobalSearchHit[];
  cursor: string | null;
  loading: boolean;
  localOnly: boolean;
  failed: boolean;
}

const empty = (key: string, loading = false): SearchState => ({
  key, local: [], server: [], cursor: null, loading, localOnly: false, failed: false,
});

export const searchQuery = (query: string) => {
  const text = query.trim();
  return [...text].length >= 2 ? [...text].slice(0, 256).join('') : '';
};

interface UseGlobalSearchArgs {
  query: string;
  kind?: GlobalSearchKind;
  filters: GlobalSearchFilters;
}

export const useGlobalSearch = ({ query, kind, filters }: UseGlobalSearchArgs) => {
  const q = searchQuery(query);
  const active = !!q || !!kind;
  const key = JSON.stringify([q, kind ?? null, filters]);
  const [state, setState] = useState<SearchState>(() => empty(''));
  const runRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const argsRef = useRef<GlobalSearchArgs>({ q, kind, filters });
  argsRef.current = { q, kind, filters };

  const fetchPage = useCallback(async (run: number, runKey: string, args: GlobalSearchArgs) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await searchMessagesRemote(args, controller.signal);
    if (runRef.current !== run) return;
    const base = (current: SearchState) => (current.key === runKey ? current : empty(runKey));
    if (result.data) {
      const { items, nextCursor } = result.data;
      setState((current) => {
        const from = base(current);
        return { ...from, server: args.after ? [...from.server, ...items] : items, cursor: nextCursor, loading: false };
      });
      return;
    }
    const unreachable = isUnreachable(result.error);
    setState((current) => ({ ...base(current), loading: false, localOnly: unreachable, failed: !unreachable }));
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const run = runRef.current + 1;
    runRef.current = run;
    if (!active) {
      setState(empty(key));
      return undefined;
    }
    setState((current) => ({ ...current, loading: true }));
    const timer = setTimeout(() => {
      const args = argsRef.current;
      const offline = isOffline();
      const local = searchMessagesLocal(args).catch(() => null).then((hits) => {
        if (runRef.current !== run) return;
        setState((current) => (current.key === key
          ? { ...current, local: hits ?? [] }
          : { ...empty(key, !offline), local: hits ?? [] }));
      });
      if (offline) {
        void local.then(() => {
          if (runRef.current === run) setState((current) => ({ ...current, key, loading: false, localOnly: true }));
        });
        return;
      }
      void fetchPage(run, key, args);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, fetchPage, key]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fresh = state.key === key;
  const canLoadMore = fresh && !!state.cursor && !state.loading && !state.localOnly;
  const loadMore = useCallback(() => {
    if (!canLoadMore) return;
    setState((current) => ({ ...current, loading: true }));
    void fetchPage(runRef.current, key, { ...argsRef.current, after: state.cursor });
  }, [canLoadMore, fetchPage, key, state.cursor]);

  const hits = useMemo(() => (active ? mergeHits(state.local, state.server) : []), [active, state.local, state.server]);
  return {
    active,
    hits,
    loading: active && (!fresh || state.loading),
    localOnly: active && fresh && state.localOnly,
    failed: active && fresh && state.failed,
    hasMore: fresh && !!state.cursor,
    loadMore,
  };
};
