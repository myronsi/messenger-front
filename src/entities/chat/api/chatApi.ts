import { messengerApi } from '@/shared/api/baseApi';
import type { ApiChat, GroupChatResponse, OneOnOneChatResponse } from '@/entities/chat';

export const chatApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getOneOnOneChats: builder.query<OneOnOneChatResponse, string>({
      query: (username) => `/chats/list/${username}`,
      providesTags: ['Chat'],
    }),

    getGroupChats: builder.query<GroupChatResponse, string>({
      query: (username) => `/groups/list/${username}`,
      providesTags: ['Chat'],
    }),

    getGroupDetails: builder.query<any, number>({
      query: (chatId) => `/groups/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    getChatById: builder.query<ApiChat, number>({
      query: (id) => `/chats/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chat', id }],
    }),

    createChat: builder.mutation<{ chat_id: number; message: string }, { user1: string; user2: string }>({
      query: (chatData) => ({
        url: '/chats/create',
        method: 'POST',
        body: chatData,
      }),
      invalidatesTags: ['Chat'],
    }),

    updateChat: builder.mutation<ApiChat, { id: number; name?: string; description?: string }>({
      query: ({ id, ...patch }) => ({
        url: `/chats/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Chat', id }],
    }),

    deleteChat: builder.mutation<void, number>({
      query: (id) => ({
        url: `/chats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),

    setChatPinned: builder.mutation<{ chat_id: number; is_pinned: boolean }, { chatId: number; pinned: boolean }>({
      query: ({ chatId, pinned }) => ({
        url: `/chats/${chatId}/pin`,
        method: pinned ? 'PUT' : 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),
  }),
});

export const {
  useGetOneOnOneChatsQuery,
  useGetGroupChatsQuery,
  useGetGroupDetailsQuery,
  useGetChatByIdQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useSetChatPinnedMutation,
} = chatApi;
