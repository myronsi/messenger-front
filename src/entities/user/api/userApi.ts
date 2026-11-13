import { apiClient } from '@/shared/api/client';
import { apiTask, collectPages, contractData } from '@/shared/api/tasks';
import { resolveUsername, userProfileByUsername } from '@/shared/api/users';
import { userModel } from '@/shared/api/goModels';
import type { EntityId } from '@/shared/api/entityId';
import { messengerApi } from '@/shared/api/baseApi';
import { userByIdKey, userByNameKey, withStoredFallback } from '@/shared/api/offlineStore';
import type { BlockedUsersResponse, User, UserAvatarHistoryResponse } from '../model/types';

export const userApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    searchUsers: builder.query<{ users: User[] }, string>({
      queryFn: (q, { signal }) => apiTask(async () => ({ users: (await collectPages(async after => contractData(await apiClient.GET('/users', {
        params: { query: { q, limit: 100, ...(after ? { after } : {}) } }, signal,
      })))).map(userModel) })),
      providesTags: ['User'],
    }),

    getUserByUsername: builder.query<User, string>({
      queryFn: (username, { signal }) => apiTask(() => withStoredFallback(userByNameKey(username), () => userProfileByUsername(username, signal))),
      providesTags: (result, error, username) => [{ type: 'User', id: username }],
    }),

    getUserById: builder.query<User, EntityId>({
      queryFn: (id, { signal }) => apiTask(() => withStoredFallback(userByIdKey(id), async () => userModel(contractData(await apiClient.GET('/users/{user_id}', {
        params: { path: { user_id: String(id) } }, signal,
      }))))),
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    updateContactDisplayName: builder.mutation<User, { username: string; displayName?: string | null }>({
      async onQueryStarted({ username, displayName }, { dispatch, queryFulfilled }) {
        const patch = dispatch(userApi.util.updateQueryData('getUserByUsername', username, user => {
          user.contact_display_name = displayName || null;
          user.display_name = displayName || user.account_display_name || user.username;
        }));
        try {
          const { data } = await queryFulfilled;
          dispatch(userApi.util.updateQueryData('getUserByUsername', username, user => { Object.assign(user, data); }));
        } catch {
          patch.undo();
        }
      },
      queryFn: ({ username, displayName }, { signal }) => apiTask(async () => {
        const user = await resolveUsername(username, signal);
        return userModel(contractData(await apiClient.PUT('/users/{user_id}/contact-name', {
          params: { path: { user_id: user.id } }, body: { contact_name: displayName || '' }, signal,
        })));
      }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'User', id: username },
        'Chat',
        'Message',
      ],
    }),

    deleteContactDisplayName: builder.mutation<User, string>({
      async onQueryStarted(username, { dispatch, queryFulfilled }) {
        const patch = dispatch(userApi.util.updateQueryData('getUserByUsername', username, user => {
          user.contact_display_name = null;
          user.display_name = user.account_display_name || user.username;
        }));
        try {
          const { data } = await queryFulfilled;
          dispatch(userApi.util.updateQueryData('getUserByUsername', username, user => { Object.assign(user, data); }));
        } catch {
          patch.undo();
        }
      },
      queryFn: (username, { signal }) => apiTask(async () => {
        const user = await resolveUsername(username, signal);
        contractData(await apiClient.DELETE('/users/{user_id}/contact-name', {
          params: { path: { user_id: user.id } }, signal,
        }));
        return userProfileByUsername(username, signal);
      }),
      invalidatesTags: (result, error, username) => [
        { type: 'User', id: username },
        'Chat',
        'Message',
      ],
    }),

    getUserAvatar: builder.query<{ avatar_url: string }, string>({
      queryFn: (username, { signal }) => apiTask(async () => ({ avatar_url: (await resolveUsername(username, signal)).avatar_url || '' })),
      providesTags: (result, error, username) => [{ type: 'Avatar', id: username }],
    }),

    getUserAvatarHistory: builder.query<UserAvatarHistoryResponse, string>({
      queryFn: (username, { signal }) => apiTask(async () => {
        const user = await resolveUsername(username, signal);
        const items = await collectPages(async after => contractData(await apiClient.GET('/users/{user_id}/avatars', {
          params: { path: { user_id: user.id }, query: { limit: 100, ...(after ? { after } : {}) } }, signal,
        })));
        return { avatars: items.map((item, index) => ({ ...item, avatar_url: item.url, is_current: index === 0 })) };
      }),
      providesTags: (result, error, username) => [{ type: 'Avatar', id: `${username}-history` }],
    }),

    deleteMyAvatar: builder.mutation<unknown, { id: EntityId; username: string }>({
      queryFn: ({ id }, { signal }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/me/avatars/{avatar_id}', { params: { path: { avatar_id: String(id) } }, signal }));
        return { message: 'Avatar deleted' };
      }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'Avatar', id: `${username}-history` },
        { type: 'Avatar', id: username },
        { type: 'User', id: username },
        'Auth',
      ],
    }),

    getBlockedUsers: builder.query<BlockedUsersResponse, void>({
      queryFn: (_, { signal }) => apiTask(async () => ({ users: (await collectPages(async after => contractData(await apiClient.GET('/me/blocked-users', {
        params: { query: { limit: 100, ...(after ? { after } : {}) } }, signal,
      })))).map(userModel) })),
      providesTags: ['Privacy'],
    }),

    blockUser: builder.mutation<{ message: string }, string>({
      queryFn: (username, { signal }) => apiTask(async () => {
        const user = await resolveUsername(username, signal);
        contractData(await apiClient.PUT('/me/blocked-users/{user_id}', { params: { path: { user_id: user.id } }, signal }));
        return { message: 'Success' };
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),

    unblockUser: builder.mutation<{ message: string }, string>({
      queryFn: (username, { signal }) => apiTask(async () => {
        const user = await resolveUsername(username, signal);
        contractData(await apiClient.DELETE('/me/blocked-users/{user_id}', { params: { path: { user_id: user.id } }, signal }));
        return { message: 'Success' };
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),
  }),
});

export const {
  useSearchUsersQuery,
  useGetUserByUsernameQuery,
  useLazyGetUserByUsernameQuery,
  useGetUserByIdQuery,
  useUpdateContactDisplayNameMutation,
  useDeleteContactDisplayNameMutation,
  useGetUserAvatarQuery,
  useGetUserAvatarHistoryQuery,
  useDeleteMyAvatarMutation,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = userApi;
