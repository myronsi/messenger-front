import { messengerApi } from '@/shared/api/baseApi';
import type {
  LoginRequest,
  LoginResponse,
  RecoveryRequest,
  RecoveryResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  TokenResponse,
  TwoFactorLoginRequest,
} from '../model/types';

// The account endpoints of the v2 contract (tag "auth"). The refresh token travels as an HttpOnly cookie,
// so every answer here only carries the access token.
export const authApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),

    loginTwoFactor: builder.mutation<TokenResponse, TwoFactorLoginRequest>({
      query: (body) => ({ url: '/auth/login/2fa', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),

    refreshSession: builder.mutation<TokenResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),

    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth', 'User', 'Chat', 'Message'],
    }),

    startRecovery: builder.mutation<RecoveryResponse, RecoveryRequest>({
      query: (body) => ({ url: '/auth/recover', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<void, ResetPasswordRequest>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLoginTwoFactorMutation,
  useRefreshSessionMutation,
  useRegisterMutation,
  useLogoutMutation,
  useStartRecoveryMutation,
  useResetPasswordMutation,
} = authApi;
