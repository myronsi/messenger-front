import { messengerApi } from '@/shared/api/baseApi';
import { apiClient, publicApiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import type { AuthResponse, LoginRequest, TwoFactorLoginRequest } from '../model/types';

export const authApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      queryFn: (body, { signal }) => apiTask(async () => contractData(await publicApiClient.POST('/auth/login', { body, signal }))),
      invalidatesTags: ['Auth'],
    }),

    loginTwoFactor: builder.mutation<AuthResponse, TwoFactorLoginRequest>({
      queryFn: (body, { signal }) => apiTask(async () => contractData(await publicApiClient.POST('/auth/login/2fa', { body, signal }))),
      invalidatesTags: ['Auth'],
    }),

    logout: builder.mutation<void, void>({
      queryFn: (_, { signal }) => apiTask(async () => { contractData(await apiClient.POST('/auth/logout', { signal })); }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

  }),
});

export const {
  useLoginMutation,
  useLoginTwoFactorMutation,
  useLogoutMutation,
} = authApi;
