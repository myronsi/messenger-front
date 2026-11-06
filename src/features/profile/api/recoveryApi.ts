import { apiTask, contractData } from '@/shared/api/tasks';
import { messengerApi } from '@/shared/api/baseApi';
import { apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';

export type RecoveryKeyStatus = components['schemas']['RecoveryKeyStatus'];
export type SecurityActivity = components['schemas']['SecurityEventPage']['items'][number];

export const recoveryApi = messengerApi.injectEndpoints({
  endpoints: builder => ({
    getRecoveryOverview: builder.query<components['schemas']['RecoveryOverview'], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/recovery-status', { signal }))),
      providesTags: ['Auth'],
    }),
    getPasskeys: builder.query<components['schemas']['Passkey'][], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/auth/passkeys', { signal })).items),
      providesTags: ['Auth'],
    }),
    getRecoveryEmail: builder.query<components['schemas']['RecoveryEmailStatus'], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/email', { signal }))),
      providesTags: ['Auth'],
    }),
    getRecoveryKeyStatus: builder.query<RecoveryKeyStatus, void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/recovery-key', { signal }))),
      providesTags: ['Auth'],
    }),
    getSecurityActivity: builder.query<SecurityActivity[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/security-events', { signal })).items),
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetRecoveryKeyStatusQuery, useGetSecurityActivityQuery, useGetRecoveryOverviewQuery, useGetPasskeysQuery, useGetRecoveryEmailQuery,
} = recoveryApi;
