import type { GlobalSearchFilters, GlobalSearchHit, GlobalSearchKind, GlobalSearchType } from '@/entities/message';

export type SearchTab = 'all' | 'messages' | 'media' | 'links' | 'files';

export const SEARCH_TABS: SearchTab[] = ['all', 'messages', 'media', 'links', 'files'];

export const TAB_KIND: Record<SearchTab, GlobalSearchKind | undefined> = {
  all: undefined, messages: undefined, media: 'visual', links: 'link', files: 'file',
};

export const SEARCH_TYPES: GlobalSearchType[] = ['text', 'file', 'voice', 'sticker'];

export interface PickedValue {
  id: string;
  name: string;
}

export interface SearchFilterState {
  chat?: PickedValue;
  sender?: PickedValue;
  type?: GlobalSearchType;
  fromDate?: string;
  toDate?: string;
}

const startOfDay = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

export const toApiFilters = (state: SearchFilterState): GlobalSearchFilters => {
  const filters: GlobalSearchFilters = {};
  if (state.chat) filters.chatId = state.chat.id;
  if (state.sender) filters.senderId = state.sender.id;
  if (state.type) filters.type = state.type;
  if (state.fromDate) filters.from = startOfDay(state.fromDate).toISOString();
  if (state.toDate) {
    const end = startOfDay(state.toDate);
    end.setDate(end.getDate() + 1);
    filters.to = end.toISOString();
  }
  return filters;
};

export const hasFilters = (state: SearchFilterState) => Object.values(state).some(Boolean);

export const sendersOf = (hits: GlobalSearchHit[], currentUserId?: string): PickedValue[] => {
  const seen = new Map<string, PickedValue>();
  hits.forEach(({ message }) => {
    const id = message.sender_id == null ? '' : String(message.sender_id);
    if (id && id !== currentUserId && !seen.has(id)) seen.set(id, { id, name: message.sender });
  });
  return [...seen.values()];
};
