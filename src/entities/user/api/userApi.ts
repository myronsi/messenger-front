import type { EntityId } from '@/shared/api/entityId';
import { messengerApi } from '@/shared/api/baseApi';
import type { BlockedUsersResponse, User, UserAvatarHistoryResponse } from '../model/types';

export const userApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),

    searchUsers: builder.query<{ users: User[] }, string>({
      query: (searchTerm) => `/users/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: ['User'],
    }),

    getUserByUsername: builder.query<User, string>({
      query: (username) => `/users/users/${username}`,
      providesTags: (result, error, username) => [{ type: 'User', id: username }],
    }),

    getUserById: builder.query<User, EntityId>({
      query: (id) => `/users/${id}`,
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
      query: ({ username, displayName }) => ({
        url: `/users/users/${encodeURIComponent(username)}/contact-name`,
        method: 'PUT',
        body: { display_name: displayName || '' },
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
      query: (username) => ({
        url: `/users/users/${encodeURIComponent(username)}/contact-name`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, username) => [
        { type: 'User', id: username },
        'Chat',
        'Message',
      ],
    }),

    getUserAvatar: builder.query<{ avatar_url: string }, string>({
      query: (username) => `/users/avatar/${username}`,
      providesTags: (result, error, username) => [{ type: 'Avatar', id: username }],
    }),

    getUserAvatarHistory: builder.query<UserAvatarHistoryResponse, string>({
      query: (username) => `/users/users/${username}/avatars`,
      providesTags: (result, error, username) => [{ type: 'Avatar', id: `${username}-history` }],
    }),

    deleteMyAvatar: builder.mutation<unknown, { id: EntityId; username: string }>({
      query: ({ id }) => ({ url: `/auth/me/avatars/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'Avatar', id: `${username}-history` },
        { type: 'Avatar', id: username },
        { type: 'User', id: username },
        'Auth',
      ],
    }),

    getBlockedUsers: builder.query<BlockedUsersResponse, void>({
      query: () => '/auth/me/blocked-users',
      providesTags: ['Privacy'],
    }),

    blockUser: builder.mutation<{ message: string }, string>({
      query: (username) => ({
        url: `/auth/me/blocked-users/${encodeURIComponent(username)}`,
        method: 'POST',
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),

    unblockUser: builder.mutation<{ message: string }, string>({
      query: (username) => ({
        url: `/auth/me/blocked-users/${encodeURIComponent(username)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),
  }),
});

export const {
  useGetUsersQuery,
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
