import { messengerApi } from '@/shared/api/baseApi';
import { queryFor, type QueryOf, type ResponseOf, type Schema } from '@/shared/api/contract';
import type { Id } from '@/shared/lib/ids';
import { toAppMessage } from '../model/fromApi';

// Full-text search over the caller's chats (GET /search/messages), page by page with the API's cursor.

const SEARCH_PAGE = 20;

export type MessageSearchArgs = Omit<QueryOf<'searchAllMessages'>, 'limit' | 'after'>;

export interface MessageSearchHit {
  id: Id;
  chatId: Id;
  senderId?: Id;
  senderName: string;
  senderUsername: string | null;
  avatarUrl?: string;
  timestamp: string;
  kind: Schema<'MessageType'>;
  // The message text, or the file name of an attachment.
  text: string;
  // The matching excerpt with U+E000/U+E001 around the matches; null when the API sent none.
  highlight: string | null;
}

export interface MessageSearchPage {
  hits: MessageSearchHit[];
  nextCursor: string | null;
}

export const toSearchHit = (hit: Schema<'SearchHit'>): MessageSearchHit => {
  const message = toAppMessage(hit.message);
  return {
    id: hit.message.id,
    chatId: hit.message.chat_id,
    senderId: message.sender_id,
    senderName: message.sender,
    senderUsername: message.sender_username ?? null,
    avatarUrl: message.avatar_url,
    timestamp: hit.message.created_at,
    kind: hit.message.type,
    text: hit.message.content || hit.message.attachment?.filename || '',
    highlight: hit.highlight ?? null,
  };
};

export const searchApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    searchMessages: builder.infiniteQuery<MessageSearchPage, MessageSearchArgs, string | null>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
      query: ({ queryArg, pageParam }) => `/search/messages${queryFor<'searchAllMessages'>({
        ...queryArg, limit: SEARCH_PAGE, after: pageParam ?? undefined,
      })}`,
      transformResponse: (page: ResponseOf<'searchAllMessages'>) => ({
        hits: page.items.map(toSearchHit),
        nextCursor: page.next_cursor,
      }),
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useSearchMessagesInfiniteQuery } = searchApi;
