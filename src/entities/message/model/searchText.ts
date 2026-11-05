import type { ChatSearchResult } from './types';

export const getSearchText = (result: ChatSearchResult) => {
  if (typeof result.content === 'string') return result.content;
  return result.content?.file_name || '';
};
