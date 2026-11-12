import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { splitByQuery } from '@/shared/lib/searchHighlight';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { matchingSearchText, searchExcerpt } from '../model/searchText';
import type { ChatSearchResult } from '../model/types';

interface ChatSearchResultsListProps {
  results: ChatSearchResult[];
  query: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const ChatSearchResultsList: React.FC<ChatSearchResultsListProps> = ({ results, query, activeIndex, onSelect }) => {
  const { language } = useLanguage();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [activeIndex]);

  return (
    <div data-testid="chat-search-results" className="absolute inset-x-0 top-full z-[60] max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-border
      bg-background shadow-lg md:max-h-[60vh]">
      {results.map((result, index) => (
        <button key={result.id} ref={index === activeIndex ? activeRef : undefined} type="button" onClick={() => onSelect(index)}
          aria-current={index === activeIndex || undefined}
          className={`flex w-full flex-col gap-0.5 border-b border-border/60 px-4 py-2.5 text-left last:border-b-0 hover:bg-accent/60 sm:px-6 ${
            index === activeIndex ? 'bg-accent' : ''}`}>
          <span className="flex max-w-full items-center justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">{result.sender}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatDateLabel(result.timestamp, language, today, yesterday)}, {formatTime(result.timestamp, language)}
            </span>
          </span>
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {splitByQuery(searchExcerpt(matchingSearchText(result, query), query), query).map((part, key) => (part.match
              ? <mark key={key} data-search-match className="rounded-sm bg-highlight text-foreground">{part.text}</mark>
              : <React.Fragment key={key}>{part.text}</React.Fragment>))}
          </span>
        </button>
      ))}
    </div>
  );
};
