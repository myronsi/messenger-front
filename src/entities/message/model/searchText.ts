import type { ChatSearchResult } from './types';

export const getSearchText = (result: ChatSearchResult) => {
  if (typeof result.content === 'string') return result.content;
  return result.content?.file_name || '';
};

export const matchingSearchText = (result: ChatSearchResult, query: string) => {
  if (typeof result.content === 'string' || !result.content) return getSearchText(result);
  const candidates = [result.content.caption, result.content.file_name].filter((text): text is string => !!text);
  return candidates.find((text) => text.toLowerCase().includes(query.toLowerCase())) ?? candidates[0] ?? '';
};

const LEAD = 40;

export const searchExcerpt = (text: string, query: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = query ? flat.toLowerCase().indexOf(query.toLowerCase()) : -1;
  return at > LEAD ? `…${flat.slice(at - LEAD)}` : flat;
};
