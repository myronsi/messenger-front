import { messengerApi } from '@/shared/api/baseApi';
import type { BodyOf, ResponseOf } from '@/shared/api/contract';
import { uploadAttachment } from '@/shared/api/attachments';
import { toUser, type User } from '@/entities/user';
import type { Id } from '@/shared/lib/ids';
import type {
  PrivacyExceptionEffect,
  PrivacyExceptionKey,
  PrivacyExceptionLists,
  PrivacySettings,
  SecuritySettings,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  UserSessionsResponse,
} from '../model/types';

const EXCEPTION_KEYS: PrivacyExceptionKey[] = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites'];

type ApiPrivacySettings = ResponseOf<'getPrivacySettings'>;

// The account of the signed-in user (tag "me" of the v2 contract).
export const profileApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User, void>({
      query: () => '/me',
      transformResponse: (me: ResponseOf<'getMe'>) => toUser(me),
      providesTags: ['Auth'],
    }),

    updateUser: builder.mutation<User, BodyOf<'updateMe'>>({
      query: (patch) => ({ url: '/me', method: 'PATCH', body: patch }),
      transformResponse: (me: ResponseOf<'updateMe'>) => toUser(me),
      invalidatesTags: ['Auth', 'User'],
    }),

    updateUserBio: builder.mutation<User, { bio: string }>({
      query: ({ bio }) => ({ url: '/me', method: 'PATCH', body: { bio: bio.trim() || null } satisfies BodyOf<'updateMe'> }),
      transformResponse: (me: ResponseOf<'updateMe'>) => toUser(me),
      invalidatesTags: ['Auth'],
    }),

    // An avatar is an attachment (purpose "avatar") that PUT /me/avatar makes current.
    uploadAvatar: builder.mutation<User, File | Blob>({
      async queryFn(file, _api, _extra, fetchWithBQ) {
        try {
          const attachment = await uploadAttachment(file, 'avatar');
          const result = await fetchWithBQ({
            url: '/me/avatar',
            method: 'PUT',
            body: { attachment_id: attachment.id } satisfies BodyOf<'setMyAvatar'>,
          });
          if (result.error) return { error: result.error };
          return { data: toUser(result.data as ResponseOf<'setMyAvatar'>) };
        } catch (error) {
          return { error: error as { status: number; data?: unknown } };
        }
      },
      invalidatesTags: ['Auth', 'Avatar', 'User'],
    }),

    deleteAccount: builder.mutation<void, BodyOf<'deleteMe'>>({
      query: (body) => ({ url: '/me', method: 'DELETE', body }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

    getSecuritySettings: builder.query<SecuritySettings, void>({
      query: () => '/me/security',
      providesTags: ['Auth'],
    }),

    updateSessionDuration: builder.mutation<SecuritySettings, number>({
      query: (sessionDurationDays) => ({
        url: '/me/security',
        method: 'PATCH',
        body: { session_duration_days: sessionDurationDays } satisfies BodyOf<'updateSecuritySettings'>,
      }),
      invalidatesTags: ['Auth'],
    }),

    getSessions: builder.query<UserSessionsResponse, void>({
      query: () => '/me/sessions',
      transformResponse: (page: ResponseOf<'listSessions'>) => ({
        sessions: page.items.map((session) => ({
          id: session.id,
          user_agent: session.device ?? '',
          created_at: session.created_at,
          last_active_at: session.last_used_at,
          expires_at: session.expires_at,
          is_current: session.is_current,
        })),
      }),
      providesTags: ['Auth'],
    }),

    revokeSession: builder.mutation<void, string>({
      query: (sessionId) => ({ url: `/me/sessions/${encodeURIComponent(sessionId)}`, method: 'DELETE' }),
      invalidatesTags: ['Auth'],
    }),

    revokeOtherSessions: builder.mutation<void, void>({
      query: () => ({ url: '/me/sessions', method: 'DELETE' }),
      invalidatesTags: ['Auth'],
    }),

    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: ({ currentPassword, newPassword }) => ({
        url: '/me/password',
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword } satisfies BodyOf<'changePassword'>,
      }),
      invalidatesTags: ['Auth'],
    }),

    setupTwoFactor: builder.mutation<TwoFactorSetupResponse, void>({
      query: () => ({ url: '/me/2fa/setup', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),

    confirmTwoFactor: builder.mutation<TwoFactorConfirmResponse, string>({
      query: (code) => ({ url: '/me/2fa/confirm', method: 'POST', body: { code } satisfies BodyOf<'confirmTwoFactor'> }),
      invalidatesTags: ['Auth'],
    }),

    disableTwoFactor: builder.mutation<void, BodyOf<'disableTwoFactor'>>({
      query: (body) => ({ url: '/me/2fa/disable', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),

    // The settings, with the users of every exception list looked up so they can be shown by name.
    getPrivacySettings: builder.query<PrivacySettings, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const result = await fetchWithBQ('/me/privacy');
        if (result.error) return { error: result.error };
        const { exceptions, ...settings } = result.data as ApiPrivacySettings;
        const ids = new Set<Id>();
        EXCEPTION_KEYS.forEach((key) => {
          exceptions[key]?.allow.forEach((id) => ids.add(id));
          exceptions[key]?.deny.forEach((id) => ids.add(id));
        });
        const users = new Map<Id, User>();
        await Promise.all([...ids].map(async (id) => {
          const user = await fetchWithBQ(`/users/${encodeURIComponent(id)}`);
          // A user who is gone still shows up, by id, so the entry can be removed.
          users.set(id, user.data ? toUser(user.data as ResponseOf<'getUser'>) : { id, username: id, display_name: id, is_deleted: true });
        }));
        const lookup = (list: Id[] = []) => list.map((id) => users.get(id)).filter((user): user is User => Boolean(user));
        const privacy_exceptions = Object.fromEntries(EXCEPTION_KEYS.map((key) => [
          key,
          { allow: lookup(exceptions[key]?.allow), deny: lookup(exceptions[key]?.deny) },
        ])) as PrivacyExceptionLists;
        return { data: { ...settings, privacy_exceptions } };
      },
      providesTags: ['Privacy'],
    }),

    updatePrivacySettings: builder.mutation<void, BodyOf<'updatePrivacySettings'>>({
      query: (patch) => ({ url: '/me/privacy', method: 'PATCH', body: patch }),
      transformResponse: () => undefined,
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
    }),

    // Replaces one exception list with these users.
    updatePrivacyExceptions: builder.mutation<void, { settingKey: PrivacyExceptionKey; effect: PrivacyExceptionEffect; userIds: Id[] }>({
      query: ({ settingKey, effect, userIds }) => ({
        url: `/me/privacy/exceptions/${settingKey}/${effect}`,
        method: 'PUT',
        body: { user_ids: userIds } satisfies BodyOf<'replacePrivacyExceptions'>,
      }),
      transformResponse: () => undefined,
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
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
  useUpdatePrivacyExceptionsMutation,
} = profileApi;
