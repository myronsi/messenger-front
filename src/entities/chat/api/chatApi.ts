import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { messengerApi } from '@/shared/api/baseApi';
import { uploadAttachment } from '@/shared/api/attachments';
import { queryFor, type BodyOf, type ResponseOf } from '@/shared/api/contract';
import type { UserRef } from '@/entities/user';
import { maxId, type Id } from '@/shared/lib/ids';
import type {
  ApprovalRequestInboxResponse,
  CreateChatResponse,
  GroupChatResponse,
  MarkChatReadRequest,
  MarkChatReadResponse,
  OneOnOneChatResponse,
  RawGroupDetails,
} from '../model/types';
import {
  toApprovalRequest,
  toDirectChatItem,
  toGroupChatItem,
  toGroupDetails,
  type ApiChat,
  type DirectChatItem,
  type GroupChatItem,
} from '../model/fromApi';

// All of the user's chats, split the way the screens use them.
export interface ChatsData {
  direct: DirectChatItem[];
  groups: GroupChatItem[];
}

type FetchWithBQ = (args: string | FetchArgs) => ReturnType<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>;

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

// Every page of a cursor-paginated list.
const fetchAllPages = async <Item,>(path: string, fetchWithBQ: FetchWithBQ): Promise<{ items: Item[] } | { error: FetchBaseQueryError }> => {
  const items: Item[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const result = await fetchWithBQ(`${path}${separator}${queryFor<'listChats'>({ limit: PAGE_SIZE, after: after ?? undefined }).slice(1)}`);
    if (result.error) return { error: result.error };
    const data = result.data as { items: Item[]; next_cursor: string | null };
    items.push(...data.items);
    if (!data.next_cursor) break;
    after = data.next_cursor;
  }
  return { items };
};

const resolveUserId = async (user: UserRef, fetchWithBQ: FetchWithBQ): Promise<{ id: Id } | { error: FetchBaseQueryError }> => {
  if ('id' in user) return { id: user.id };
  const result = await fetchWithBQ(`/usernames/${encodeURIComponent(user.username.replace(/^@/, ''))}`);
  if (result.error) return { error: result.error };
  return { id: (result.data as ResponseOf<'getUserByUsername'>).id };
};

const isChat = (body: ResponseOf<'createChat'>): body is ApiChat => 'unread_count' in body;

// Chats, approval requests and groups of the v2 contract (tags "chats", "requests", "groups").
export const chatApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getChats: builder.query<ChatsData, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const result = await fetchAllPages<ApiChat>('/chats', fetchWithBQ);
        if ('error' in result) return { error: result.error };
        return {
          data: {
            direct: result.items.filter((chat) => chat.type === 'direct').map(toDirectChatItem),
            groups: result.items.filter((chat) => chat.type === 'group').map(toGroupChatItem),
          },
        };
      },
      providesTags: ['Chat'],
    }),

    getGroupDetails: builder.query<RawGroupDetails, Id>({
      query: (chatId) => `/groups/${encodeURIComponent(chatId)}`,
      transformResponse: (group: ResponseOf<'getGroup'>) => toGroupDetails(group),
      keepUnusedDataFor: 300,
      providesTags: (result, error, chatId) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    // Opens the direct chat with a user: the existing one, a new one, or an approval request when the user
    // wants to approve new chats first.
    createChat: builder.mutation<CreateChatResponse, { user: UserRef; initialMessage?: string }>({
      async queryFn({ user, initialMessage }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: '/chats',
          method: 'POST',
          body: { user_id: resolved.id, initial_message: initialMessage?.trim() || null } satisfies BodyOf<'createChat'>,
        });
        if (result.error) return { error: result.error };
        const body = result.data as ResponseOf<'createChat'>;
        return isChat(body)
          ? { data: { chat_id: body.id, message: '' } }
          : { data: { message: '', approval_required: true, request_id: body.id } };
      },
      invalidatesTags: ['Chat', 'Request'],
    }),

    getApprovalRequestInbox: builder.query<ApprovalRequestInboxResponse, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const result = await fetchAllPages<ResponseOf<'listApprovalRequests'>['items'][number]>('/requests', fetchWithBQ);
        if ('error' in result) return { error: result.error };
        const requests = result.items.map(toApprovalRequest);
        return { data: { requests, unread_count: requests.filter((request) => request.status === 'pending').length } };
      },
      providesTags: ['Request'],
    }),

    approveApprovalRequest: builder.mutation<{ chat_id?: Id }, Id>({
      query: (requestId) => ({ url: `/requests/${encodeURIComponent(requestId)}/approve`, method: 'POST' }),
      transformResponse: (chat: ResponseOf<'approveRequest'>) => ({ chat_id: chat.id }),
      invalidatesTags: ['Request', 'Chat'],
    }),

    rejectApprovalRequest: builder.mutation<void, Id>({
      query: (requestId) => ({ url: `/requests/${encodeURIComponent(requestId)}/reject`, method: 'POST' }),
      transformResponse: () => undefined,
      invalidatesTags: ['Request'],
    }),

    deleteChat: builder.mutation<void, Id>({
      query: (chatId) => ({ url: `/chats/${encodeURIComponent(chatId)}`, method: 'DELETE' }),
      invalidatesTags: ['Chat'],
    }),

    setChatPinned: builder.mutation<{ chat_id: Id; is_pinned: boolean }, { chatId: Id; pinned: boolean }>({
      query: ({ chatId, pinned }) => ({ url: `/chats/${encodeURIComponent(chatId)}/pin`, method: pinned ? 'PUT' : 'DELETE' }),
      transformResponse: (_body, _meta, { chatId, pinned }) => ({ chat_id: chatId, is_pinned: pinned }),
      invalidatesTags: ['Chat'],
    }),

    // --- Groups. Every change answers the group's new details. ---

    createGroup: builder.mutation<RawGroupDetails, { name: string; description?: string | null; members: UserRef[] }>({
      async queryFn({ name, description, members }, _api, _extra, fetchWithBQ) {
        const memberIds: Id[] = [];
        for (const member of members) {
          const resolved = await resolveUserId(member, fetchWithBQ);
          if ('error' in resolved) return { error: resolved.error };
          memberIds.push(resolved.id);
        }
        const result = await fetchWithBQ({
          url: '/groups',
          method: 'POST',
          body: { name: name.trim(), description: description?.trim() || null, member_ids: memberIds } satisfies BodyOf<'createGroup'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'createGroup'>) };
      },
      invalidatesTags: ['Chat'],
    }),

    updateGroup: builder.mutation<RawGroupDetails, { chatId: Id } & BodyOf<'updateGroup'>>({
      query: ({ chatId, ...patch }) => ({ url: `/groups/${encodeURIComponent(chatId)}`, method: 'PATCH', body: patch }),
      transformResponse: (group: ResponseOf<'updateGroup'>) => toGroupDetails(group),
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    // A group avatar is an attachment (purpose "avatar") that PUT /groups/{id}/avatar makes current.
    setGroupAvatar: builder.mutation<RawGroupDetails, { chatId: Id; file: File | Blob }>({
      async queryFn({ chatId, file }, _api, _extra, fetchWithBQ) {
        try {
          const attachment = await uploadAttachment(file, 'avatar');
          const result = await fetchWithBQ({
            url: `/groups/${encodeURIComponent(chatId)}/avatar`,
            method: 'PUT',
            body: { attachment_id: attachment.id } satisfies BodyOf<'setGroupAvatar'>,
          });
          if (result.error) return { error: result.error };
          return { data: toGroupDetails(result.data as ResponseOf<'setGroupAvatar'>) };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    addGroupParticipant: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants`,
          method: 'POST',
          body: { user_id: resolved.id } satisfies BodyOf<'addGroupParticipant'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'addGroupParticipant'>) };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    updateGroupParticipantRole: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef; role: BodyOf<'updateGroupParticipantRole'>['role'] }>({
      async queryFn({ chatId, user, role }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants/${encodeURIComponent(resolved.id)}`,
          method: 'PATCH',
          body: { role } satisfies BodyOf<'updateGroupParticipantRole'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'updateGroupParticipantRole'>) };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    // Removing a member answers nothing; the details are loaded again.
    removeGroupParticipant: builder.mutation<void, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/participants/${encodeURIComponent(resolved.id)}`,
          method: 'DELETE',
        });
        return result.error ? { error: result.error } : { data: undefined };
      },
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: `group-details-${chatId}` }],
    }),

    transferGroupOwnership: builder.mutation<RawGroupDetails, { chatId: Id; user: UserRef }>({
      async queryFn({ chatId, user }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({
          url: `/groups/${encodeURIComponent(chatId)}/transfer-owner`,
          method: 'POST',
          body: { user_id: resolved.id } satisfies BodyOf<'transferGroupOwnership'>,
        });
        if (result.error) return { error: result.error };
        return { data: toGroupDetails(result.data as ResponseOf<'transferGroupOwnership'>) };
      },
      invalidatesTags: (result, error, { chatId }) => ['Chat', { type: 'Chat', id: `group-details-${chatId}` }],
    }),

    leaveGroup: builder.mutation<void, Id>({
      query: (chatId) => ({ url: `/groups/${encodeURIComponent(chatId)}/leave`, method: 'POST' }),
      invalidatesTags: ['Chat'],
    }),

    deleteGroup: builder.mutation<void, Id>({
      query: (chatId) => ({ url: `/groups/${encodeURIComponent(chatId)}`, method: 'DELETE' }),
      invalidatesTags: ['Chat'],
    }),

    // Moves the read marker to the newest of the messages (or, with markAll, of the chat's newest message,
    // which the caller passes as lastMessageId).
    markChatRead: builder.mutation<MarkChatReadResponse, MarkChatReadRequest>({
      async queryFn({ chatId, messageIds = [], lastMessageId }, _api, _extra, fetchWithBQ) {
        const newest = maxId([...messageIds, lastMessageId]);
        if (!newest) return { data: { chat_id: chatId, unread_count: 0, first_unread_message_id: null, read_message_ids: [], read_at: new Date().toISOString() } };
        const result = await fetchWithBQ({
          url: `/chats/${encodeURIComponent(chatId)}/read`,
          method: 'POST',
          body: { message_id: newest } satisfies BodyOf<'markChatRead'>,
        });
        if (result.error) return { error: result.error };
        const { unread_count } = result.data as ResponseOf<'markChatRead'>;
        return {
          data: {
            chat_id: chatId,
            unread_count,
            first_unread_message_id: null,
            read_message_ids: messageIds,
            read_at: new Date().toISOString(),
          },
        };
      },
      invalidatesTags: ['Chat'],
    }),
  }),
});

export const {
  useGetChatsQuery,
  useGetGroupDetailsQuery,
  useCreateChatMutation,
  useGetApprovalRequestInboxQuery,
  useApproveApprovalRequestMutation,
  useRejectApprovalRequestMutation,
  useDeleteChatMutation,
  useSetChatPinnedMutation,
  useMarkChatReadMutation,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useSetGroupAvatarMutation,
  useAddGroupParticipantMutation,
  useUpdateGroupParticipantRoleMutation,
  useRemoveGroupParticipantMutation,
  useTransferGroupOwnershipMutation,
  useLeaveGroupMutation,
  useDeleteGroupMutation,
} = chatApi;

// The direct chats in the shape of the v1 list ({ chats }), for the pickers and the profile panel.
export const useGetOneOnOneChatsQuery = (options: { skip?: boolean } = {}) => chatApi.useGetChatsQuery(undefined, {
  skip: options.skip,
  selectFromResult: (result) => ({ ...result, data: result.data ? ({ chats: result.data.direct } satisfies OneOnOneChatResponse) : undefined }),
});

export const useGetGroupChatsQuery = (options: { skip?: boolean } = {}) => chatApi.useGetChatsQuery(undefined, {
  skip: options.skip,
  selectFromResult: (result) => ({ ...result, data: result.data ? ({ groups: result.data.groups } satisfies GroupChatResponse) : undefined }),
});
