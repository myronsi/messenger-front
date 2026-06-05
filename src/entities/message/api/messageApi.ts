import { messengerApi } from '@/shared/api/baseApi';
import type { Message, MessageHistoryResponse } from '@/entities/message';

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

    getMessageHistory: builder.query<MessageHistoryResponse, { chatId: number; limit?: number; beforeId?: number | null }>({
      query: ({ chatId, limit = 50, beforeId }) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (beforeId) params.set('before_id', String(beforeId));
        return `/messages/history/${chatId}?${params.toString()}`;
      },
      providesTags: (result, error, { chatId }) => [{ type: 'Message', id: chatId }],
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
  useGetMessageHistoryQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} = messageApi;
