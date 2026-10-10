import type { Id } from '@/shared/lib/ids';
import { messengerApi } from '@/shared/api/baseApi';
import { queryFor, type ResponseOf } from '@/shared/api/contract';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { toUser, type BlockedUsersResponse, type User, type UserAvatarHistoryResponse, type UserSearchResponse } from '../model/types';

// A user as the caller knows them: by id, or by username (looked up first). A bare string is neither, so
// tsc catches a username passed where the API needs an id.
export type UserRef = { id: Id } | { username: string };

export type FetchWithBQ = (args: string | FetchArgs) => ReturnType<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>;

// resolveUserId turns a UserRef into the id the API needs (looking a username up first).
export const resolveUserId = async (ref: UserRef, fetchWithBQ: FetchWithBQ): Promise<{ id: Id } | { error: FetchBaseQueryError }> => {
  if ('id' in ref) return { id: ref.id };
  const result = await fetchWithBQ(`/usernames/${encodeURIComponent(ref.username.replace(/^@/, ''))}`);
  if (result.error) return { error: result.error };
  return { id: (result.data as ResponseOf<'getUserByUsername'>).id };
};

const refKey = (ref: UserRef) => ('id' in ref ? ref.id : `@${ref.username.toLowerCase()}`);

// Users of the v2 contract (tag "users"). Users are addressed by id; GET /usernames/{username} finds one by
// name.
export const userApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    // Users matching a name or username; respects their search visibility.
    searchUsers: builder.query<UserSearchResponse, string>({
      query: (searchTerm) => `/users${queryFor<'searchUsers'>({ q: searchTerm, limit: 20 })}`,
      transformResponse: (page: ResponseOf<'searchUsers'>) => ({ users: page.items.map(toUser) }),
      providesTags: ['User'],
    }),

    getUserByUsername: builder.query<User, string>({
      query: (username) => `/usernames/${encodeURIComponent(username.replace(/^@/, ''))}`,
      transformResponse: (user: ResponseOf<'getUserByUsername'>) => toUser(user),
      providesTags: (result, error, username) => [{ type: 'User', id: result?.id ?? username }],
    }),

    getUserById: builder.query<User, Id>({
      query: (id) => `/users/${encodeURIComponent(id)}`,
      transformResponse: (user: ResponseOf<'getUser'>) => toUser(user),
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // The viewer's own name for a user; an empty name removes it.
    // An empty name removes it. The tags refresh every place that shows the user.
    updateContactDisplayName: builder.mutation<void, { user: UserRef; displayName?: string | null }>({
      async queryFn({ user, displayName }, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const url = `/users/${encodeURIComponent(resolved.id)}/contact-name`;
        const result = await fetchWithBQ(displayName?.trim()
          ? { url, method: 'PUT', body: { contact_name: displayName.trim() } }
          : { url, method: 'DELETE' });
        return result.error ? { error: result.error } : { data: undefined };
      },
      invalidatesTags: (result, error, { user }) => [{ type: 'User', id: refKey(user) }, 'User', 'Chat', 'Message'],
    }),

    // The avatars of a user, newest first; the first is the current one.
    getUserAvatarHistory: builder.query<UserAvatarHistoryResponse, UserRef>({
      async queryFn(user, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ(`/users/${encodeURIComponent(resolved.id)}/avatars${queryFor<'listUserAvatars'>({ limit: 50 })}`);
        if (result.error) return { error: result.error };
        const page = result.data as ResponseOf<'listUserAvatars'>;
        return {
          data: {
            avatars: page.items.map((avatar, index) => ({
              id: avatar.id,
              avatar_url: avatar.url,
              created_at: avatar.created_at,
              is_current: index === 0,
            })),
          },
        };
      },
      providesTags: (result, error, user) => [{ type: 'Avatar', id: `${refKey(user)}-history` }],
    }),

    getBlockedUsers: builder.query<BlockedUsersResponse, void>({
      query: () => `/me/blocked-users${queryFor<'listBlockedUsers'>({ limit: 100 })}`,
      transformResponse: (page: ResponseOf<'listBlockedUsers'>) => ({ users: page.items.map(toUser) }),
      providesTags: ['Privacy'],
    }),

    blockUser: builder.mutation<void, UserRef>({
      async queryFn(user, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({ url: `/me/blocked-users/${encodeURIComponent(resolved.id)}`, method: 'PUT' });
        return result.error ? { error: result.error } : { data: undefined };
      },
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),

    unblockUser: builder.mutation<void, UserRef>({
      async queryFn(user, _api, _extra, fetchWithBQ) {
        const resolved = await resolveUserId(user, fetchWithBQ);
        if ('error' in resolved) return { error: resolved.error };
        const result = await fetchWithBQ({ url: `/me/blocked-users/${encodeURIComponent(resolved.id)}`, method: 'DELETE' });
        return result.error ? { error: result.error } : { data: undefined };
      },
      invalidatesTags: ['Privacy', 'User', 'Chat'],
    }),
  }),
});

export const {
  useSearchUsersQuery,
  useGetUserByUsernameQuery,
  useLazyGetUserByUsernameQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useUpdateContactDisplayNameMutation,
  useGetUserAvatarHistoryQuery,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = userApi;
