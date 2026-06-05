import { messengerApi } from '@/shared/api/baseApi';
import type { AuthResponse, LoginRequest, RegisterRequest, TwoFactorLoginRequest } from '@/features/auth';

export const authApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    loginTwoFactor: builder.mutation<AuthResponse, TwoFactorLoginRequest>({
      query: (payload) => ({
        url: '/auth/login/2fa',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Auth'],
    }),

    refreshSession: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

    forgotUsername: builder.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/auth/recover',
        method: 'POST',
        body: data,
      }),
    }),

    resetPassword: builder.mutation<{ message: string }, { token: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),

    getCloudPart: builder.query<any, void>({
      query: () => '/auth/get-cloud-part',
    }),
  }),
});

export const {
  useLoginMutation,
  useLoginTwoFactorMutation,
  useRefreshSessionMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotUsernameMutation,
  useResetPasswordMutation,
  useGetCloudPartQuery,
} = authApi;
