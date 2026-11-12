import { historySnapshot, rememberChatSnapshot } from '@/shared/api/chatSnapshots';
import { apiClient } from '@/shared/api/client';
import { contractQuery } from '@/shared/api/queryResult';
import { messageModel } from '@/shared/api/goModels';
import type { EntityId } from '@/shared/api/entityId';
import { messengerApi } from '@/shared/api/baseApi';
import type { ChatAudiosResponse, ChatFilesResponse, ChatPhotosResponse, ChatSearchResponse, ForwardMessagesResponse, Message } from '../model/types';
import type { MessageHistoryResponse } from '../model/history';

export const messageApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation<{ message: string; filePath: string }, FormData>({
      query: (formData) => ({
        url: '/messages/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Message'],
    }),

    uploadVoiceMessage: builder.mutation<{ message: string; filePath: string }, FormData>({
      query: (formData) => ({
        url: '/messages/vm',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Message'],
    }),

    forwardMessage: builder.mutation<ForwardMessagesResponse, { sourceMessageId: EntityId; targetChatIds: EntityId[] }>({
      query: ({ sourceMessageId, targetChatIds }) => ({
        url: '/messages/forward',
        method: 'POST',
        body: {
          source_message_id: sourceMessageId,
          target_chat_ids: targetChatIds,
        },
      }),
      invalidatesTags: ['Message', 'Chat'],
    }),

    forwardMessages: builder.mutation<{ items: unknown[] }, { chatId: EntityId; messageIds: EntityId[]; targetChatIds: EntityId[] }>({
      query: ({ chatId, messageIds, targetChatIds }) => ({
        url: `/chats/${chatId}/messages/forward`,
        method: 'POST',
        body: { message_ids: messageIds.map(String), chat_ids: targetChatIds.map(String) },
      }),
      invalidatesTags: ['Message', 'Chat'],
    }),

    deleteMessages: builder.mutation<void, { chatId: EntityId; messageIds: EntityId[]; scope: 'me' | 'everyone' }>({
      query: ({ chatId, messageIds, scope }) => ({
        url: `/chats/${chatId}/messages/delete`,
        method: 'POST',
        body: { message_ids: messageIds.map(String), scope },
      }),
    }),

    getMessageHistory: builder.query<MessageHistoryResponse, {
      chatId: EntityId; limit?: number; beforeId?: EntityId | null; afterId?: EntityId | null;
      aroundId?: EntityId | null;
    }>({
      queryFn: ({ chatId, limit = 50, beforeId, afterId, aroundId }, { signal }) => contractQuery(async () => {
        const result = await apiClient.GET('/chats/{chat_id}/messages', {
          params: { path: { chat_id: String(chatId) }, query: {
            limit, ...(beforeId ? { before: String(beforeId) } : {}),
            ...(afterId ? { after: String(afterId) } : {}), ...(aroundId ? { around: String(aroundId) } : {}),
          } }, signal,
        });
        const page = result.data;
        return { ...result, data: page ? {
          history: page.items.map(messageModel), has_more: Boolean(page.next_cursor),
          has_more_before: Boolean(afterId ? page.prev_cursor : page.next_cursor),
          has_more_after: Boolean(afterId ? page.next_cursor : page.prev_cursor),
          next_before_id: (afterId ? page.prev_cursor : page.next_cursor) ?? null,
          next_after_id: (afterId ? page.next_cursor : page.prev_cursor) ?? null,
        } : undefined };
      }),
      onQueryStarted: ({ chatId, limit = 50, beforeId, afterId, aroundId }, { queryFulfilled }) => {
        if (limit === 50 && !beforeId && !afterId) return rememberChatSnapshot(historySnapshot(chatId, aroundId), queryFulfilled);
      },
      keepUnusedDataFor: 300,
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: chatId }],
    }),

    getChatPhotos: builder.query<ChatPhotosResponse, EntityId>({
      query: (chatId) => `/messages/photos/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-photos` }],
    }),

    getChatAudios: builder.query<ChatAudiosResponse, EntityId>({
      query: (chatId) => `/messages/audios/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-audios` }],
    }),

    getChatFiles: builder.query<ChatFilesResponse, EntityId>({
      query: (chatId) => `/messages/files/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-files` }],
    }),

    searchChatMessages: builder.query<ChatSearchResponse, { chatId: EntityId; query: string }>({
      query: ({ chatId, query }) => `/messages/search/${chatId}?q=${encodeURIComponent(query)}`,
      keepUnusedDataFor: 60,
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: `${chatId}-search` }],
    }),

    getMessages: builder.query<Message[], { chatId: EntityId; page?: number; limit?: number }>({
      query: ({ chatId, page = 1, limit = 50 }) =>
        `/chats/${chatId}/messages?page=${page}&limit=${limit}`,
      providesTags: (result, error, { chatId }) => [
        { type: 'Message', id: chatId },
        ...(result ? result.map(({ id }) => ({ type: 'Message' as const, id })) : []),
      ],
    }),

    sendMessage: builder.mutation<Message, { chatId: EntityId; content?: string; type: string; file?: File; replyTo?: EntityId }>({
      query: ({ chatId, ...messageData }) => {
        const formData = new FormData();
        if (messageData.content) formData.append('content', messageData.content);
        formData.append('type', messageData.type);
        if (messageData.file) formData.append('file', messageData.file);
        if (messageData.replyTo) formData.append('replyTo', messageData.replyTo.toString());

        return {
          url: `/chats/${chatId}/messages`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { chatId }) => [
        { type: 'Message', id: chatId },
        'Chat',
      ],
    }),

    updateMessage: builder.mutation<Message, { id: EntityId; content: string }>({
      query: ({ id, content }) => ({
        url: `/messages/${id}`,
        method: 'PATCH',
        body: { content },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Message', id }],
    }),

    deleteMessage: builder.mutation<void, EntityId>({
      query: (id) => ({
        url: `/messages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }],
    }),

    deleteMessageForMe: builder.mutation<void, EntityId>({
      query: (id) => ({
        url: `/messages/${id}/delete-for-me`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }],
    }),

    addReaction: builder.mutation<Message, { messageId: EntityId; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [{ type: 'Message', id: messageId }],
    }),

    removeReaction: builder.mutation<Message, { messageId: EntityId; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'DELETE',
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [{ type: 'Message', id: messageId }],
    }),
  }),
});

export const {
  useUploadFileMutation,
  useUploadVoiceMessageMutation,
  useForwardMessageMutation,
  useForwardMessagesMutation,
  useDeleteMessagesMutation,
  useGetMessageHistoryQuery,
  useLazyGetMessageHistoryQuery,
  useGetChatPhotosQuery,
  useGetChatAudiosQuery,
  useGetChatFilesQuery,
  useSearchChatMessagesQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useDeleteMessageForMeMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} = messageApi;
