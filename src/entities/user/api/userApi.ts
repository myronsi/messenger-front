import { messengerApi } from '@/shared/api/baseApi';
import type { User } from '@/entities/user';
import type { UserAvatarHistoryResponse } from '@/features/profile';

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

    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    updateContactDisplayName: builder.mutation<User, { username: string; displayName?: string | null }>({
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

    uploadUserAvatar: builder.mutation<{ message: string }, FormData>({
      query: (formData) => ({
        url: '/users/users/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Auth', 'Avatar'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useSearchUsersQuery,
  useGetUserByUsernameQuery,
  useGetUserByIdQuery,
  useUpdateContactDisplayNameMutation,
  useDeleteContactDisplayNameMutation,
  useGetUserAvatarQuery,
  useGetUserAvatarHistoryQuery,
  useUploadUserAvatarMutation,
} = userApi;
