import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { messengerApi } from '@/shared/api/baseApi';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];
export type InviteLink = Schema['InviteLink'];
export type GroupPreview = Schema['GroupPreview'];
export type PublicGroup = Schema['PublicGroup'];
export type GroupBan = Schema['GroupBan'];
export type JoinedChat = Schema['Chat'];

export interface CreateInviteLinkArgs {
  chatId: EntityId;
  name: string | null;
  expiresAt: string | null;
  maxUses: number | null;
}

const chat = (chatId: EntityId) => ({ chat_id: String(chatId) });
const linksTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `invite-links-${chatId}` });
const bansTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `group-bans-${chatId}` });
const detailsTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `group-details-${chatId}` });
const mentionsTag = (chatId: EntityId) => ({ type: 'Chat' as const, id: `mentions-${chatId}` });

export const groupSharingApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getInviteLinks: builder.query<InviteLink[], EntityId>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/groups/{chat_id}/invite-links', {
        params: { path: chat(chatId) }, signal,
      })).items),
      providesTags: (result, error, chatId) => [linksTag(chatId)],
    }),
    createInviteLink: builder.mutation<InviteLink, CreateInviteLinkArgs>({
      queryFn: ({ chatId, name, expiresAt, maxUses }, { signal }) => apiTask(async () => contractData(await apiClient.POST('/groups/{chat_id}/invite-links', {
        params: { path: chat(chatId) }, body: { name, expires_at: expiresAt, max_uses: maxUses }, signal,
      }))),
      invalidatesTags: (result, error, { chatId }) => [linksTag(chatId)],
    }),
    revokeInviteLink: builder.mutation<void, { chatId: EntityId; linkId: EntityId }>({
      queryFn: ({ chatId, linkId }, { signal }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/groups/{chat_id}/invite-links/{link_id}', {
          params: { path: { ...chat(chatId), link_id: String(linkId) } }, signal,
        }));
      }),
      invalidatesTags: (result, error, { chatId }) => [linksTag(chatId)],
    }),
    getPublicNameAvailability: builder.query<boolean, string>({
      queryFn: (name, { signal }) => apiTask(async () => contractData(await apiClient.GET('/public-names/{public_name}/availability', {
        params: { path: { public_name: name } }, signal,
      })).available),
      keepUnusedDataFor: 10,
    }),
    setGroupPublicName: builder.mutation<Schema['Group'], { chatId: EntityId; name: string }>({
      queryFn: ({ chatId, name }, { signal }) => apiTask(async () => contractData(await apiClient.PUT('/groups/{chat_id}/public-name', {
        params: { path: chat(chatId) }, body: { public_name: name }, signal,
      }))),
      invalidatesTags: (result, error, { chatId }) => (error ? [] : [detailsTag(chatId)]),
    }),
    clearGroupPublicName: builder.mutation<Schema['Group'], EntityId>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.DELETE('/groups/{chat_id}/public-name', {
        params: { path: chat(chatId) }, signal,
      }))),
      invalidatesTags: (result, error, chatId) => (error ? [] : [detailsTag(chatId)]),
    }),
    getGroupBans: builder.query<GroupBan[], EntityId>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/groups/{chat_id}/bans', {
        params: { path: chat(chatId), query: { limit: 100 } }, signal,
      })).items),
      providesTags: (result, error, chatId) => [bansTag(chatId)],
    }),
    unbanGroupUser: builder.mutation<void, { chatId: EntityId; userId: EntityId }>({
      queryFn: ({ chatId, userId }, { signal }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/groups/{chat_id}/bans/{user_id}', {
          params: { path: { ...chat(chatId), user_id: String(userId) } }, signal,
        }));
      }),
      invalidatesTags: (result, error, { chatId }) => [bansTag(chatId)],
    }),
    getInvite: builder.query<GroupPreview, string>({
      queryFn: (token, { signal }) => apiTask(async () => contractData(await apiClient.GET('/invites/{token}', {
        params: { path: { token } }, signal,
      }))),
      keepUnusedDataFor: 60,
    }),
    getPublicGroup: builder.query<GroupPreview, string>({
      queryFn: (name, { signal }) => apiTask(async () => contractData(await apiClient.GET('/public-groups/{public_name}', {
        params: { path: { public_name: name } }, signal,
      }))),
      keepUnusedDataFor: 30,
    }),
    searchPublicGroups: builder.query<GroupPreview[], string>({
      queryFn: (q, { signal }) => apiTask(async () => contractData(await apiClient.GET('/public-groups', {
        params: { query: { q, limit: 10 } }, signal,
      })).items),
      keepUnusedDataFor: 30,
    }),
    joinGroup: builder.mutation<JoinedChat, { token?: string; name?: string }>({
      queryFn: ({ token, name }, { signal }) => apiTask(async () => contractData(token
        ? await apiClient.POST('/invites/{token}/join', { params: { path: { token } }, signal })
        : await apiClient.POST('/public-groups/{public_name}/join', { params: { path: { public_name: name ?? '' } }, signal }))),
      invalidatesTags: ['Chat'],
    }),
    getUnreadMentions: builder.query<EntityId[], EntityId>({
      queryFn: (chatId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/chats/{chat_id}/mentions', {
        params: { path: chat(chatId) }, signal,
      })).message_ids),
      keepUnusedDataFor: 0,
      providesTags: (result, error, chatId) => [mentionsTag(chatId)],
    }),
  }),
});

export const {
  useGetInviteLinksQuery, useCreateInviteLinkMutation, useRevokeInviteLinkMutation,
  useGetPublicNameAvailabilityQuery, useSetGroupPublicNameMutation, useClearGroupPublicNameMutation,
  useGetGroupBansQuery, useUnbanGroupUserMutation,
  useGetInviteQuery, useGetPublicGroupQuery, useSearchPublicGroupsQuery, useJoinGroupMutation, useLazyGetUnreadMentionsQuery,
} = groupSharingApi;
