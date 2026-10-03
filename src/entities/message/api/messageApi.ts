import { messengerApi } from '@/shared/api/baseApi';
import type { ChatAudiosResponse, ChatPhotosResponse, ChatSearchResponse, ForwardMessagesResponse, Message } from '../model/types';
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

    forwardMessage: builder.mutation<ForwardMessagesResponse, { sourceMessageId: number; targetChatIds: number[] }>({
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

    getMessageHistory: builder.query<MessageHistoryResponse, {
      chatId: number; limit?: number; beforeId?: number | null; afterId?: number | null;
      aroundId?: number | null;
    }>({
      query: ({ chatId, limit = 50, beforeId, afterId, aroundId }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (beforeId) params.set('before_id', String(beforeId));
        if (afterId) params.set('after_id', String(afterId));
        if (aroundId) params.set('around_id', String(aroundId));
        return `/messages/history/${chatId}?${params.toString()}`;
      },
      keepUnusedDataFor: 300,
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: chatId }],
    }),

    getChatPhotos: builder.query<ChatPhotosResponse, number>({
      query: (chatId) => `/messages/photos/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-photos` }],
    }),

    getChatAudios: builder.query<ChatAudiosResponse, number>({
      query: (chatId) => `/messages/audios/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Message', id: `${chatId}-audios` }],
    }),

    searchChatMessages: builder.query<ChatSearchResponse, { chatId: number; query: string }>({
      query: ({ chatId, query }) => `/messages/search/${chatId}?q=${encodeURIComponent(query)}`,
      keepUnusedDataFor: 60,
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: `${chatId}-search` }],
    }),

    getMessages: builder.query<Message[], { chatId: number; page?: number; limit?: number }>({
      query: ({ chatId, page = 1, limit = 50 }) =>
        `/chats/${chatId}/messages?page=${page}&limit=${limit}`,
      providesTags: (result, error, { chatId }) => [
        { type: 'Message', id: chatId },
        ...(result ? result.map(({ id }) => ({ type: 'Message' as const, id })) : []),
      ],
    }),

    sendMessage: builder.mutation<Message, { chatId: number; content?: string; type: string; file?: File; replyTo?: number }>({
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

    updateMessage: builder.mutation<Message, { id: number; content: string }>({
      query: ({ id, content }) => ({
        url: `/messages/${id}`,
        method: 'PATCH',
        body: { content },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Message', id }],
    }),

    deleteMessage: builder.mutation<void, number>({
      query: (id) => ({
        url: `/messages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }],
    }),

    deleteMessageForMe: builder.mutation<void, number>({
      query: (id) => ({
        url: `/messages/${id}/delete-for-me`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }],
    }),

    addReaction: builder.mutation<Message, { messageId: number; emoji: string }>({
      query: ({ messageId, emoji }) => ({
        url: `/messages/${messageId}/reactions`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: (result, error, { messageId }) => [{ type: 'Message', id: messageId }],
    }),

    removeReaction: builder.mutation<Message, { messageId: number; emoji: string }>({
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
  useGetMessageHistoryQuery,
  useGetChatPhotosQuery,
  useGetChatAudiosQuery,
  useSearchChatMessagesQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useDeleteMessageForMeMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} = messageApi;
