import type { CustomEmoji } from '@/entities/emoji';

const QUERY = /(^|\s):([a-z0-9_]{2,32})$/;
export const MAX_SUGGESTIONS = 6;

export interface ShortcodeQuery {
  query: string;
  start: number;
}

export const shortcodeQuery = (value: string, caret: number): ShortcodeQuery | null => {
  const match = QUERY.exec(value.slice(0, caret));
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1 };
};

export const suggestEmoji = (all: CustomEmoji[], query: string) => {
  const seen = new Set<string>();
  const starts = all.filter((emoji) => emoji.shortcode.startsWith(query));
  const contains = all.filter((emoji) => !emoji.shortcode.startsWith(query) && emoji.shortcode.includes(query));
  return [...starts, ...contains].filter((emoji) => !seen.has(emoji.shortcode) && seen.add(emoji.shortcode)).slice(0, MAX_SUGGESTIONS);
};

export const applySuggestion = (value: string, caret: number, at: ShortcodeQuery, shortcode: string) => {
  const insert = `:${shortcode}: `;
  return { value: value.slice(0, at.start) + insert + value.slice(caret), caret: at.start + insert.length };
};

export const matchesShortcode = (emoji: CustomEmoji, query: string) => emoji.shortcode.includes(query.trim().toLowerCase().replace(/^:|:$/g, ''));
