import React from 'react';
import { splitHighlight } from '@/shared/lib/highlight';

interface HighlightedTextProps {
  // A search excerpt with U+E000/U+E001 markers around the matched words.
  excerpt: string;
  className?: string;
}

// Renders a search excerpt with its matches in <mark>; the text is never parsed as HTML.
const HighlightedText: React.FC<HighlightedTextProps> = ({ excerpt, className }) => (
  <span className={className}>
    {splitHighlight(excerpt).map((part, index) => (part.marked
      ? <mark key={index} className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">{part.text}</mark>
      : <React.Fragment key={index}>{part.text}</React.Fragment>))}
  </span>
);

export default HighlightedText;
