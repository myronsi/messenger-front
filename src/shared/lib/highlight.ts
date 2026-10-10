// Search excerpts mark the matched words with two characters of the Unicode private use area (see SearchHit in
// the contract): U+E000 opens a match and U+E001 closes it. They are split here into plain and marked parts so
// the UI can render them as elements, never as HTML.

export const HIGHLIGHT_START = '';
export const HIGHLIGHT_END = '';

export interface HighlightPart {
  text: string;
  marked: boolean;
}

export const splitHighlight = (excerpt: string): HighlightPart[] => {
  const parts: HighlightPart[] = [];
  let marked = false;
  let text = '';
  const flush = () => {
    if (text) parts.push({ text, marked });
    text = '';
  };
  for (const char of excerpt) {
    if (char === HIGHLIGHT_START || char === HIGHLIGHT_END) {
      flush();
      marked = char === HIGHLIGHT_START;
    } else {
      text += char;
    }
  }
  flush();
  return parts;
};

// The excerpt without its markers, e.g. for a title attribute or a screen reader.
export const stripHighlight = (excerpt: string) => excerpt.replace(/[]/g, '');
