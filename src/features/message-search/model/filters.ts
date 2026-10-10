import type { MessageSearchArgs } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';

// Filters of the search in one chat. Dates are calendar days (yyyy-mm-dd, as <input type="date"> gives them)
// in the user's time zone; both ends are included.
export interface ChatSearchFilters {
  senderId: Id | null;
  type: MessageSearchArgs['type'] | null;
  fromDate: string;
  toDate: string;
}

export const EMPTY_FILTERS: ChatSearchFilters = { senderId: null, type: null, fromDate: '', toDate: '' };

export const hasFilters = (filters: ChatSearchFilters) => Boolean(filters.senderId || filters.type || filters.fromDate || filters.toDate);

const startOfDay = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return null;
  return new Date(year, month - 1, date);
};

// The API's `from` is inclusive and `to` exclusive, so the last day ends at the start of the next one.
export const toSearchArgs = (chatId: Id, q: string, filters: ChatSearchFilters): MessageSearchArgs => {
  const from = startOfDay(filters.fromDate);
  const to = startOfDay(filters.toDate);
  if (to) to.setDate(to.getDate() + 1);
  return {
    q,
    chat_id: chatId,
    sender_id: filters.senderId ?? undefined,
    type: filters.type ?? undefined,
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
  };
};
