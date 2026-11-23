import React from 'react';
import type { HighlightPart } from '../model/searchHits';
import { EmojiText } from '@/shared/ui/CustomEmoji';

export const Highlighted = ({ parts }: { parts: HighlightPart[] }) => (
  <>
    {parts.map((part, key) => (part.match
      ? <mark key={key} data-search-match className="rounded-sm bg-highlight text-foreground">{part.text}</mark>
      : <React.Fragment key={key}><EmojiText text={part.text} /></React.Fragment>))}
  </>
);

export const SectionTitle = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 pb-1 pt-3">
    <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
    {action}
  </div>
);

export const SeeAll = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:bg-accent">{label}</button>
);
