import { messengerApi } from '@/shared/api/baseApi';
import type { ApiChat, ApprovalRequestInboxResponse, CreateChatResponse, GroupChatResponse, MarkChatReadRequest, MarkChatReadResponse, OneOnOneChatResponse, RawGroupDetails } from '../model/types';
import type { Id } from '@/shared/lib/ids';

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

    getGroupDetails: builder.query<RawGroupDetails, Id>({
      query: (chatId) => `/groups/${chatId}`,
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    getChatById: builder.query<ApiChat, Id>({
      query: (id) => `/chats/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chat', id }],
    }),

    createChat: builder.mutation<CreateChatResponse, { user1: string; user2: string; initial_message?: string }>({
      query: (chatData) => ({
        url: '/chats/create',
        method: 'POST',
        body: chatData,
      }),
      invalidatesTags: ['Chat', 'Request'],
    }),

    getApprovalRequestInbox: builder.query<ApprovalRequestInboxResponse, void>({
      query: () => '/requests/inbox',
      providesTags: ['Request'],
    }),

    approveApprovalRequest: builder.mutation<{ message: string; chat_id?: Id }, Id>({
      query: (requestId) => ({
        url: `/requests/${requestId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Request', 'Chat', 'Message'],
    }),

    rejectApprovalRequest: builder.mutation<{ message: string }, Id>({
      query: (requestId) => ({
        url: `/requests/${requestId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['Request'],
    }),

    updateChat: builder.mutation<ApiChat, { id: Id; name?: string; description?: string }>({
      query: ({ id, ...patch }) => ({
        url: `/chats/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Chat', id }],
    }),

    deleteChat: builder.mutation<void, Id>({
      query: (id) => ({
        url: `/chats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),

    setChatPinned: builder.mutation<{ chat_id: Id; is_pinned: boolean }, { chatId: Id; pinned: boolean }>({
      query: ({ chatId, pinned }) => ({
        url: `/chats/${chatId}/pin`,
        method: pinned ? 'PUT' : 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),

    markChatRead: builder.mutation<MarkChatReadResponse, MarkChatReadRequest>({
      query: ({ chatId, messageIds = [], markAll = false }) => ({
        url: `/chats/${chatId}/read`,
        method: 'POST',
        body: markAll ? { mark_all: true } : { message_ids: messageIds },
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
  useGetApprovalRequestInboxQuery,
  useApproveApprovalRequestMutation,
  useRejectApprovalRequestMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useSetChatPinnedMutation,
  useMarkChatReadMutation,
} = chatApi;
