import { messengerApi } from '@/shared/api/baseApi';
import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { userModel } from '@/shared/api/goModels';
import { getAccessToken } from '@/shared/auth/session';
import { rememberSignedInUser } from '@/shared/auth/signedInUser';
import { hasSessionChanged } from '@/shared/auth/tokenClaims';
import type { components } from './generated/schema';

export type CurrentUser = ReturnType<typeof userModel> & Pick<components['schemas']['Me'], 'recovery_setup_required' | 'created_at'>;

export const currentUserApi = messengerApi.injectEndpoints({
  endpoints: builder => ({
    getCurrentUser: builder.query<CurrentUser, void>({
      queryFn: (_, { signal }) => apiTask(async () => {
        const me = contractData(await apiClient.GET('/me', { signal }));
        return { ...userModel(me), created_at: me.created_at, recovery_setup_required: me.recovery_setup_required };
      }),
      providesTags: ['Auth'],
      onQueryStarted: async (_, { queryFulfilled }) => {
        const token = getAccessToken();
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        const current = getAccessToken();
        if (data && token && current && !hasSessionChanged(token, current)) rememberSignedInUser(current, data);
      },
    }),
  }),
});

export const { useGetCurrentUserQuery } = currentUserApi;
