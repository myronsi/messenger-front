import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { resolveUsername } from '@/shared/api/users';
import { userModel } from '@/shared/api/goModels';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { apiUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { privacyModel, privacyPatch } from './privacyModel';
import type { EntityId } from '@/shared/api/entityId';
import { messengerApi } from '@/shared/api/baseApi';
import type { User } from '@/entities/user';
import type {
  PrivacyExceptionEffect,
  PrivacyExceptionKey,
  PrivacySettings,
  SecuritySettings,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  UserSessionsResponse,
} from '../model/types';

export const profileApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation<User, Partial<User> & { id: EntityId }>({
      queryFn: ({ display_name, bio }, { signal }) => apiTask(async () => userModel(contractData(await apiClient.PATCH('/me', { body: { display_name, bio }, signal })))),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'Auth'],
    }),

    updateUserBio: builder.mutation<{ message: string }, { bio: string }>({
      queryFn: (body, { signal }) => apiTask(async () => { contractData(await apiClient.PATCH('/me', { body, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth'],
    }),

    uploadAvatar: builder.mutation<{ message: string }, FormData>({
      queryFn: (formData, { signal }) => apiTask(async () => {
        const form = new FormData();
        const file = formData.get('file');
        if (!(file instanceof Blob)) throw new Error('Choose an image.');
        form.set('file', file); form.set('purpose', 'avatar');
        const attachment = await uploadWithProgress<components['schemas']['Attachment']>({ url: apiUrl('/attachments'), formData: form });
        contractData(await apiClient.PUT('/me/avatar', { body: { attachment_id: attachment.id }, signal }));
        return { message: 'Success' };
      }),
      invalidatesTags: ['Auth'],
    }),

    deleteAccount: builder.mutation<{ message: string }, string>({
      queryFn: (password, { signal }) => apiTask(async () => { contractData(await apiClient.DELETE('/me', { body: { password }, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

    getSecuritySettings: builder.query<SecuritySettings, void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/security', { signal }))),
      providesTags: ['Auth'],
    }),

    updateSessionDuration: builder.mutation<SecuritySettings, number>({
      queryFn: (days, { signal }) => apiTask(async () => contractData(await apiClient.PATCH('/me/security', { body: { session_duration_days: days }, signal }))),
      invalidatesTags: ['Auth'],
    }),

    getSessions: builder.query<UserSessionsResponse, void>({
      queryFn: (_, { signal }) => apiTask(async () => ({ sessions: contractData(await apiClient.GET('/me/sessions', { signal })).items.map(session => ({
        ...session, user_agent: session.device || '', last_active_at: session.last_used_at,
      })) })),
      providesTags: ['Auth'],
    }),

    revokeSession: builder.mutation<{ message: string }, string>({
      queryFn: (id, { signal }) => apiTask(async () => { contractData(await apiClient.DELETE('/me/sessions/{session_id}', { params: { path: { session_id: id } }, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth'],
    }),

    revokeOtherSessions: builder.mutation<{ message: string }, void>({
      queryFn: (_, { signal }) => apiTask(async () => { contractData(await apiClient.DELETE('/me/sessions', { signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth'],
    }),

    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      queryFn: ({ currentPassword, newPassword }, { signal }) => apiTask(async () => { contractData(await apiClient.PUT('/me/password', { body: { current_password: currentPassword, new_password: newPassword }, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth'],
    }),

    setupTwoFactor: builder.mutation<TwoFactorSetupResponse, string>({
      queryFn: (password, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/2fa/setup', { body: { password }, signal }))),
      invalidatesTags: ['Auth'],
    }),

    confirmTwoFactor: builder.mutation<TwoFactorConfirmResponse, string>({
      queryFn: (code, { signal }) => apiTask(async () => ({ ...contractData(await apiClient.POST('/me/2fa/confirm', { body: { code }, signal })), message: 'Success' })),
      invalidatesTags: ['Auth'],
    }),

    disableTwoFactor: builder.mutation<{ message: string }, { password: string; code: string }>({
      queryFn: (body, { signal }) => apiTask(async () => { contractData(await apiClient.POST('/me/2fa/disable', { body, signal })); return { message: 'Success' }; }),
      invalidatesTags: ['Auth'],
    }),

    getPrivacySettings: builder.query<PrivacySettings, void>({
      queryFn: (_, { signal }) => apiTask(async () => privacyModel(contractData(await apiClient.GET('/me/privacy', { signal })), signal)),
      providesTags: ['Privacy'],
    }),

    updatePrivacySettings: builder.mutation<PrivacySettings, Partial<PrivacySettings>>({
      queryFn: (patch, { signal }) => apiTask(async () => privacyModel(contractData(await apiClient.PATCH('/me/privacy', { body: privacyPatch(patch), signal })), signal)),
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
    }),

    updatePrivacyExceptions: builder.mutation<PrivacySettings, { settingKey: PrivacyExceptionKey; effect: PrivacyExceptionEffect; usernames: string[] }>({
      queryFn: ({ settingKey, effect, usernames }, { signal }) => apiTask(async () => {
        const users = await Promise.all(usernames.map(name => resolveUsername(name, signal)));
        return privacyModel(contractData(await apiClient.PUT('/me/privacy/exceptions/{setting_key}/{effect}', {
          params: { path: { setting_key: settingKey, effect } }, body: { user_ids: users.map(user => user.id) }, signal,
        })), signal);
      }),
      invalidatesTags: ['Privacy', 'User', 'Chat', 'Message'],
    }),
  }),
});

export const {
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
