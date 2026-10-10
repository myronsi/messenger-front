import { queryFor, type ResponseOf } from '@/shared/api/contract';
import type { Id } from '@/shared/lib/ids';
import type { MessageHistoryResponse } from '../model/history';
import { toAppMessage } from '../model/fromApi';

// GET /chats/{id}/messages: no cursor is the newest page; `before`, `after` and `around` are message ids.
export interface HistoryRequest {
  limit: number;
  before?: Id | null;
  after?: Id | null;
  around?: Id | null;
}

export type HistoryDirection = 'latest' | 'before' | 'after' | 'around';

export const historyDirection = ({ before, after, around }: HistoryRequest): HistoryDirection => {
  if (after) return 'after';
  if (before) return 'before';
  if (around) return 'around';
  return 'latest';
};

export const historyPath = (chatId: Id, request: HistoryRequest) => `/chats/${encodeURIComponent(chatId)}/messages${queryFor<'listMessages'>({
  limit: request.limit,
  before: request.before ?? undefined,
  after: request.after ?? undefined,
  around: request.around ?? undefined,
})}`;

// toHistoryResponse maps a MessagePage (always oldest to newest) to the app's history page. next_cursor
// continues in the request's direction (older, except for `after` requests); prev_cursor goes the other way.
export const toHistoryResponse = (page: ResponseOf<'listMessages'>, direction: HistoryDirection): MessageHistoryResponse => {
  const olderCursor = direction === 'after' ? page.prev_cursor : page.next_cursor;
  const newerCursor = direction === 'after' ? page.next_cursor : page.prev_cursor;
  return {
    history: page.items.map((message) => toAppMessage(message)),
    has_more: Boolean(olderCursor),
    has_more_before: Boolean(olderCursor),
    has_more_after: Boolean(newerCursor),
    next_before_id: olderCursor ?? null,
    next_after_id: newerCursor ?? null,
  };
};
