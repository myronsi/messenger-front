import { globalSearchText, type GlobalSearchHit } from '@/entities/message';

export type HighlightPart = { text: string; match: boolean };

const MARK_START = '';
const MARK_END = '';
const LEAD = 40;
const WORD = /[\p{L}\p{N}]+/gu;

const padded = (id: string) => id.padStart(24, '0');

export const hitKey = (hit: GlobalSearchHit) => `${hit.chatId}|${String(hit.message.id)}`;

export const newestFirst = (a: GlobalSearchHit, b: GlobalSearchHit) => {
  const left = padded(String(a.message.id));
  const right = padded(String(b.message.id));
  return left === right ? 0 : left < right ? 1 : -1;
};

export const mergeHits = (local: GlobalSearchHit[], server: GlobalSearchHit[]) => {
  const byKey = new Map<string, GlobalSearchHit>();
  local.forEach((hit) => byKey.set(hitKey(hit), hit));
  server.forEach((hit) => byKey.set(hitKey(hit), hit));
  return [...byKey.values()].sort(newestFirst);
};

export const markedParts = (text: string): HighlightPart[] => {
  const parts: HighlightPart[] = [];
  let match = false;
  let buffer = '';
  for (const char of text) {
    if (char !== MARK_START && char !== MARK_END) {
      buffer += char;
      continue;
    }
    if (buffer) parts.push({ text: buffer, match });
    buffer = '';
    match = char === MARK_START;
  }
  if (buffer) parts.push({ text: buffer, match });
  return parts;
};

export const queryWords = (query: string) =>
  [...query.normalize('NFKC').toLocaleLowerCase().matchAll(WORD)].map((found) => found[0]).filter((word) => word.length >= 2);

export const queryParts = (text: string, query: string): HighlightPart[] => {
  const words = queryWords(query);
  const flat = text.replace(/\s+/g, ' ').trim();
  const ranges: [number, number][] = [];
  for (const found of flat.matchAll(WORD)) {
    const lower = found[0].toLocaleLowerCase();
    const length = Math.max(0, ...words.filter((word) => lower.startsWith(word)).map((word) => word.length));
    if (length) ranges.push([found.index, found.index + length]);
  }
  const start = ranges.length && ranges[0][0] > LEAD ? ranges[0][0] - LEAD : 0;
  const parts: HighlightPart[] = start ? [{ text: '…', match: false }] : [];
  let cursor = start;
  for (const [from, to] of ranges) {
    if (from > cursor) parts.push({ text: flat.slice(cursor, from), match: false });
    parts.push({ text: flat.slice(from, to), match: true });
    cursor = to;
  }
  if (cursor < flat.length) parts.push({ text: flat.slice(cursor), match: false });
  return parts;
};

export const hitText = (hit: GlobalSearchHit) => {
  const text = globalSearchText(hit.message);
  if (text) return text;
  const { content } = hit.message;
  return content && typeof content === 'object' ? content.file_name || '' : '';
};

export const hitParts = (hit: GlobalSearchHit, query: string) =>
  (hit.highlight ? markedParts(hit.highlight) : queryParts(hitText(hit), query));
