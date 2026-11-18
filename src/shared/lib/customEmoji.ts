import { apiUrl } from '@/shared/api/config';

export interface EmojiToken {
  start: number;
  end: number;
  animated: boolean;
  shortcode: string;
  id: string;
}

export type EmojiTextPart = { kind: 'text'; text: string } | { kind: 'emoji'; token: EmojiToken };

export interface KnownEmoji {
  id: string;
  shortcode: string;
  is_animated: boolean;
}

const TOKEN = /<(a?):([a-z0-9_]{2,32}):([1-9][0-9]{0,18})>/g;
const SHORTCODE = /:([a-z0-9_]{2,32}):/g;
const REACTION_PREFIX = 'c:';
const MAX_LARGE = 3;

export const parseEmojiTokens = (text: string): EmojiToken[] => Array.from(text.matchAll(TOKEN), (match) => ({
  start: match.index ?? 0,
  end: (match.index ?? 0) + match[0].length,
  animated: match[1] === 'a',
  shortcode: match[2],
  id: match[3],
}));

export const splitEmoji = (text: string): EmojiTextPart[] => {
  const parts: EmojiTextPart[] = [];
  let last = 0;
  for (const token of parseEmojiTokens(text)) {
    if (token.start > last) parts.push({ kind: 'text', text: text.slice(last, token.start) });
    parts.push({ kind: 'emoji', token });
    last = token.end;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
};

export const hasEmojiTokens = (text?: string | null) => !!text && parseEmojiTokens(text).length > 0;

export const plainEmoji = (text: string) => text.replace(TOKEN, (_, __, shortcode: string) => `:${shortcode}:`);

export const emojiToken = ({ id, shortcode, is_animated }: KnownEmoji) => `<${is_animated ? 'a' : ''}:${shortcode}:${id}>`;

export const encodeShortcodes = (text: string, known: ReadonlyMap<string, KnownEmoji>) => {
  if (!known.size) return text;
  const tokens = parseEmojiTokens(text);
  const outside = (index: number) => !tokens.some((token) => index >= token.start && index < token.end);
  return text.replace(SHORTCODE, (match: string, shortcode: string, offset: number) => {
    const emoji = known.get(shortcode);
    return emoji && outside(offset) ? emojiToken(emoji) : match;
  });
};

export const isEmojiOnly = (text: string) => {
  const tokens = parseEmojiTokens(text);
  return tokens.length > 0 && tokens.length <= MAX_LARGE && text.replace(TOKEN, '').trim() === '';
};

export const customReactionId = (reaction: string) => (
  reaction.startsWith(REACTION_PREFIX) && /^[1-9][0-9]{0,18}$/.test(reaction.slice(REACTION_PREFIX.length)) ? reaction.slice(REACTION_PREFIX.length) : null
);

export const customReaction = (id: string) => `${REACTION_PREFIX}${id}`;

export const emojiImageUrl = (id: string, inline = false) => apiUrl(`/emoji/items/${id}/image${inline ? '?variant=inline' : ''}`);
