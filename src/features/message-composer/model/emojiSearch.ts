import type { AppLanguage } from '@/shared/lang/languages';

interface CompactEmoji {
  unicode: string;
  label: string;
  group?: number;
  tags?: string[];
}

type Loader = () => Promise<{ default: CompactEmoji[] }>;

const LOADERS: Record<AppLanguage, Loader> = {
  en: () => import('emojibase-data/en/compact.json') as Promise<{ default: CompactEmoji[] }>,
  ru: () => import('emojibase-data/ru/compact.json') as Promise<{ default: CompactEmoji[] }>,
  es: () => import('emojibase-data/es/compact.json') as Promise<{ default: CompactEmoji[] }>,
  de: () => import('emojibase-data/de/compact.json') as Promise<{ default: CompactEmoji[] }>,
};

const COMPONENT_GROUP = 2;
const RESULT_LIMIT = 96;

export interface EmojiIndex {
  order: string[];
  words: Map<string, string[]>;
}

export const normalizeSearch = (text: string) => text.toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim();

const emojiKey = (emoji: string) => emoji.replace(/️/g, '');

const wordsOf = (entry: CompactEmoji) => [entry.label, ...(entry.tags ?? [])].flatMap((text) => normalizeSearch(text).split(/[\s:,.()-]+/)).filter(Boolean);

export const buildEmojiIndex = (...lists: CompactEmoji[][]): EmojiIndex => {
  const order: string[] = [];
  const words = new Map<string, string[]>();
  lists.forEach((list) => list.forEach((entry) => {
    if (entry.group === undefined || entry.group === COMPONENT_GROUP) return;
    const key = emojiKey(entry.unicode);
    const known = words.get(key);
    if (!known) order.push(entry.unicode);
    words.set(key, [...(known ?? []), ...wordsOf(entry)]);
  }));
  return { order, words };
};

const cache = new Map<AppLanguage, Promise<EmojiIndex>>();

export const loadEmojiIndex = (language: AppLanguage) => {
  const cached = cache.get(language);
  if (cached) return cached;
  const lists = language === 'en' ? [LOADERS.en()] : [LOADERS[language](), LOADERS.en()];
  const index = Promise.all(lists).then((modules) => buildEmojiIndex(...modules.map((module) => module.default)));
  index.catch(() => cache.delete(language));
  cache.set(language, index);
  return index;
};

export const emojiMatches = (index: EmojiIndex, emoji: string, query: string) => {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return false;
  if (emojiKey(query.trim()) === emojiKey(emoji)) return true;
  const words = index.words.get(emojiKey(emoji)) ?? [];
  return terms.every((term) => words.some((word) => word.startsWith(term)));
};

export const searchEmoji = (index: EmojiIndex, query: string, limit = RESULT_LIMIT) => {
  const results: string[] = [];
  for (const emoji of index.order) {
    if (emojiMatches(index, emoji, query)) results.push(emoji);
    if (results.length >= limit) break;
  }
  return results;
};
