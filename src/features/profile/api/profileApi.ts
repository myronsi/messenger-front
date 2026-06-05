import { messengerApi } from '@/shared/api/baseApi';
import type { User } from '@/entities/user';
import type {
  BlockedUsersResponse,
  PrivacySettings,
  SecuritySettings,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  UserSessionsResponse,
} from '@/features/profile';

export const profileApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    updateUser: builder.mutation<User, Partial<User> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: '/auth/me',
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'Auth'],
    }),

    updateUserBio: builder.mutation<{ message: string }, { bio: string }>({
      query: (data) => ({
        url: '/auth/me/bio',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    uploadAvatar: builder.mutation<{ message: string }, FormData>({
      query: (formData) => ({
        url: '/auth/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Auth'],
    }),

    deleteAccount: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

    getSecuritySettings: builder.query<SecuritySettings, void>({
      query: () => '/auth/me/security',
      providesTags: ['Auth'],
    }),

    updateSessionDuration: builder.mutation<SecuritySettings, number>({
      query: (sessionDurationDays) => ({
        url: '/auth/me/security/session-duration',
        method: 'PUT',
        body: { session_duration_days: sessionDurationDays },
      }),
      invalidatesTags: ['Auth'],
    }),

    getSessions: builder.query<UserSessionsResponse, void>({
      query: () => '/auth/me/sessions',
      providesTags: ['Auth'],
    }),

    revokeSession: builder.mutation<{ message: string }, string>({
      query: (sessionId) => ({
        url: `/auth/me/sessions/${encodeURIComponent(sessionId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    revokeOtherSessions: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/me/sessions/others',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: ({ currentPassword, newPassword }) => ({
        url: '/auth/me/password',
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword },
      }),
      invalidatesTags: ['Auth'],
    }),

    setupTwoFactor: builder.mutation<TwoFactorSetupResponse, void>({
      query: () => ({
        url: '/auth/me/2fa/setup',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    confirmTwoFactor: builder.mutation<TwoFactorConfirmResponse, string>({
      query: (code) => ({
        url: '/auth/me/2fa/confirm',
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ['Auth'],
    }),

    disableTwoFactor: builder.mutation<{ message: string }, { password: string; code: string }>({
      query: (payload) => ({
        url: '/auth/me/2fa/disable',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Auth'],
    }),

    getPrivacySettings: builder.query<PrivacySettings, void>({
      query: () => '/auth/me/privacy',
      providesTags: ['Privacy'],
    }),

    updatePrivacySettings: builder.mutation<PrivacySettings, Partial<PrivacySettings>>({
      query: (patch) => ({
        url: '/auth/me/privacy',
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
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
  useGetCurrentUserQuery,
  useUpdateUserMutation,
  useUpdateUserBioMutation,
  useUploadAvatarMutation,
  useDeleteAccountMutation,
  useGetSecuritySettingsQuery,
  useUpdateSessionDurationMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
  useChangePasswordMutation,
  useSetupTwoFactorMutation,
  useConfirmTwoFactorMutation,
  useDisableTwoFactorMutation,
  useGetPrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
  useGetBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = profileApi;
