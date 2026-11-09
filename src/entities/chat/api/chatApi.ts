import { directChatsSnapshot, groupChatsSnapshot, rememberChatSnapshot } from '@/shared/api/chatSnapshots';
import { apiClient } from '@/shared/api/client';
import { apiTask, collectPages, contractData } from '@/shared/api/tasks';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';
import { listChats, resolveUsername } from '@/shared/api/users';
import { directChatModel, groupChatModel, groupModel, userModel } from '@/shared/api/goModels';
import type { EntityId } from '@/shared/api/entityId';
import { messengerApi } from '@/shared/api/baseApi';
import type { ApprovalRequestInboxResponse, CreateChatResponse, GroupChatResponse, GroupRoleLog, MarkChatReadRequest, MarkChatReadResponse, OneOnOneChatResponse, RawGroupDetails } from '../model/types';

// Both list endpoints project the same paginated server response. Share only
// concurrent reads so invalidation and reconnect still fetch fresh data.
let inFlight: { token: string | null; promise: ReturnType<typeof listChats> } | undefined;
function loadChatList() {
  const token = getAccessToken();
  if (inFlight?.token === token) return inFlight.promise;
  const controller = new AbortController();
  const unsubscribe = subscribeToAccessToken(next => {
    if (!next || (token && hasSessionChanged(token, next))) {
      controller.abort();
    }
  });
  const promise = listChats(controller.signal).finally(() => {
    unsubscribe();
    if (inFlight?.promise === promise) inFlight = undefined;
  });
  inFlight = { token, promise };
  return promise;
}

export const chatApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getOneOnOneChats: builder.query<OneOnOneChatResponse, string>({
      queryFn: () => apiTask(async () => ({ chats: (await loadChatList()).filter(chat => chat.type === 'direct').map(directChatModel) })),
      onQueryStarted: (_, { queryFulfilled }) => rememberChatSnapshot(directChatsSnapshot, queryFulfilled),
      providesTags: ['Chat'],
    }),

    getGroupChats: builder.query<GroupChatResponse, string>({
      queryFn: () => apiTask(async () => ({ groups: (await loadChatList()).filter(chat => chat.type === 'group').map(groupChatModel) })),
      onQueryStarted: (_, { queryFulfilled }) => rememberChatSnapshot(groupChatsSnapshot, queryFulfilled),
      providesTags: ['Chat'],
    }),

    getGroupDetails: builder.query<RawGroupDetails, EntityId>({
      queryFn: (id, { signal }) => apiTask(async () => groupModel(contractData(await apiClient.GET('/groups/{chat_id}', { params: { path: { chat_id: String(id) } }, signal })))),
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    getGroupRoleLog: builder.query<GroupRoleLog, EntityId>({
      queryFn: (id, { signal }) => apiTask(async () => contractData(await apiClient.GET('/groups/{chat_id}/role-log', { params: { path: { chat_id: String(id) } }, signal }))),
      providesTags: (result, error, chatId) => [{ type: 'Chat', id: `group-role-log-${chatId}` }],
    }),

    createChat: builder.mutation<CreateChatResponse, { user1: string; user2: string; initial_message?: string }>({
      queryFn: ({ user2, initial_message }, { signal }) => apiTask(async () => {
        const user = await resolveUsername(user2, signal);
        const result = await apiClient.POST('/chats', { body: { user_id: user.id, initial_message }, signal });
        const data = contractData(result);
        return result.response.status === 202
          ? { message: 'Approval required', approval_required: true, request_id: data.id }
          : { message: 'Chat created', chat_id: data.id };
      }),
      invalidatesTags: ['Chat', 'Request'],
    }),

    getApprovalRequestInbox: builder.query<ApprovalRequestInboxResponse, void>({
      queryFn: (_, { signal }) => apiTask(async () => {
        const requests = await collectPages(async after => contractData(await apiClient.GET('/requests', {
          params: { query: { limit: 100, ...(after ? { after } : {}) } }, signal,
        })));
        return {
          requests: requests.map(item => ({ ...item, requester: userModel(item.requester), message_text: item.preview || undefined })),
          unread_count: requests.length,
        };
      }),
      providesTags: ['Request'],
    }),

    approveApprovalRequest: builder.mutation<{ message: string; chat_id?: EntityId }, EntityId>({
      queryFn: (id, { signal }) => apiTask(async () => ({ message: 'Approved', chat_id: contractData(await apiClient.POST('/requests/{request_id}/approve', { params: { path: { request_id: String(id) } }, signal })).id })),
      invalidatesTags: ['Request', 'Chat', 'Message'],
    }),

    rejectApprovalRequest: builder.mutation<{ message: string }, EntityId>({
      queryFn: (id, { signal }) => apiTask(async () => { contractData(await apiClient.POST('/requests/{request_id}/reject', { params: { path: { request_id: String(id) } }, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Request'],
    }),

    deleteChat: builder.mutation<void, EntityId>({
      queryFn: (id, { signal }) => apiTask(async () => { contractData(await apiClient.DELETE('/chats/{chat_id}', { params: { path: { chat_id: String(id) } }, signal })); }),
      invalidatesTags: ['Chat'],
    }),

    setChatPinned: builder.mutation<{ chat_id: EntityId; is_pinned: boolean }, { chatId: EntityId; pinned: boolean }>({
      queryFn: ({ chatId, pinned }, { signal }) => apiTask(async () => {
        const params = { path: { chat_id: String(chatId) } };
        contractData(pinned ? await apiClient.PUT('/chats/{chat_id}/pin', { params, signal }) : await apiClient.DELETE('/chats/{chat_id}/pin', { params, signal }));
        return { chat_id: chatId, is_pinned: pinned };
      }),
      invalidatesTags: ['Chat'],
    }),

    markChatRead: builder.mutation<MarkChatReadResponse, MarkChatReadRequest>({
      queryFn: ({ chatId, messageIds = [], markAll = false }, { signal }) => apiTask(async () => {
        const params = { path: { chat_id: String(chatId) } };
        const ids = markAll ? contractData(await apiClient.GET('/chats/{chat_id}/messages', { params: { ...params, query: { limit: 1 } }, signal })).items.map(item => item.id) : messageIds.map(String);
        let unread = 0;
        if (ids.length) {
          const newest = ids.reduce((a, b) => BigInt(a) > BigInt(b) ? a : b);
          unread = contractData(await apiClient.POST('/chats/{chat_id}/read', { params, body: { message_id: newest }, signal })).unread_count;
        }
        return { chat_id: chatId, read_message_ids: ids, unread_count: unread, first_unread_message_id: null, read_at: new Date().toISOString() };
      }),
      invalidatesTags: ['Chat'],
    }),
  }),
});

export const {
  useGetOneOnOneChatsQuery,
  useGetGroupChatsQuery,
  useGetGroupDetailsQuery,
  useGetGroupRoleLogQuery,
  useCreateChatMutation,
  useGetApprovalRequestInboxQuery,
  useApproveApprovalRequestMutation,
  useRejectApprovalRequestMutation,
  useDeleteChatMutation,
  useSetChatPinnedMutation,
  useMarkChatReadMutation,
} = chatApi;
