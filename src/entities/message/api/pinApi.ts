import { current } from '@reduxjs/toolkit';
import { apiClient } from '@/shared/api/client';
import { contractQuery } from '@/shared/api/queryResult';
import { pinnedMessageModel } from '@/shared/api/goModels';
import { messengerApi } from '@/shared/api/baseApi';
import type { EntityId } from '@/shared/api/entityId';
import type { PinnedMessage, PinnedMessages, PinScope } from '../model/types';
import { appendPinPage, removePin, upsertPin } from '../model/pinnedMessages';

export const PIN_PAGE_SIZE = 50;

const fetchPinPage = (chatId: EntityId, after: string | null, signal?: AbortSignal) => contractQuery(async () => {
  const result = await apiClient.GET('/chats/{chat_id}/pins', {
    params: { path: { chat_id: String(chatId) }, query: { limit: PIN_PAGE_SIZE, ...(after ? { after } : {}) } }, signal,
  });
  return { ...result, data: result.data ? {
    items: result.data.items.map(pinnedMessageModel) as PinnedMessage[],
    next_cursor: result.data.next_cursor ?? null,
  } : undefined };
});

export const pinApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getPinnedMessages: builder.query<PinnedMessages, EntityId>({
      queryFn: async (chatId, { signal }) => {
        const result = await fetchPinPage(chatId, null, signal);
        if (result.error) return { error: result.error };
        const page = result.data;
        return { data: { ...page, count: page.next_cursor ? null : page.items.length } };
      },
      keepUnusedDataFor: 300,
    }),

    loadMorePinnedMessages: builder.mutation<null, { chatId: EntityId; after: string }>({
      queryFn: async ({ chatId, after }, { dispatch }) => {
        const result = await fetchPinPage(chatId, after);
        if (result.error) return { error: result.error };
        dispatch(pinApi.util.updateQueryData('getPinnedMessages', chatId, (draft) => appendPinPage(current(draft), result.data)));
        return { data: null };
      },
    }),

    pinMessage: builder.mutation<PinnedMessage, { chatId: EntityId; messageId: EntityId; scope: PinScope }>({
      queryFn: ({ chatId, messageId, scope }) => contractQuery(async () => {
        const result = await apiClient.PUT('/chats/{chat_id}/messages/{message_id}/pin', {
          params: { path: { chat_id: String(chatId), message_id: String(messageId) } }, body: { scope },
        });
        return { ...result, data: result.data ? pinnedMessageModel(result.data) as PinnedMessage : undefined };
      }),
      onQueryStarted: async ({ chatId }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(pinApi.util.updateQueryData('getPinnedMessages', chatId, (draft) => upsertPin(current(draft), data)));
        } catch {
          return;
        }
      },
    }),

    unpinMessage: builder.mutation<null, { chatId: EntityId; messageId: EntityId; scope: PinScope }>({
      queryFn: async ({ chatId, messageId, scope }) => {
        const result = await contractQuery(async () => {
          const response = await apiClient.DELETE('/chats/{chat_id}/messages/{message_id}/pin', {
            params: { path: { chat_id: String(chatId), message_id: String(messageId) }, query: { scope } },
          });
          return { ...response, data: response.response.ok ? null : undefined };
        });
        return result.error ? { error: result.error } : { data: null };
      },
      onQueryStarted: async ({ chatId, messageId, scope }, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch {
          return;
        }
        dispatch(pinApi.util.updateQueryData('getPinnedMessages', chatId, (draft) => removePin(current(draft), messageId)));
        if (scope === 'everyone') void dispatch(pinApi.endpoints.getPinnedMessages.initiate(chatId, { forceRefetch: true, subscribe: false }));
      },
    }),
  }),
});

export const {
  useGetPinnedMessagesQuery,
  useLoadMorePinnedMessagesMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
} = pinApi;
