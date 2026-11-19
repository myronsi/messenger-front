import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { messengerApi } from '@/shared/api/baseApi';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];
export type AccountStatus = Schema['AccountStatus'];
export type AccountStatusLevel = Schema['AccountStatusLevel'];
export type AccountRestriction = Schema['AccountRestriction'];
export type ReportReason = Schema['ReportReason'];

export interface ReportUserArgs {
  userId: EntityId;
  reason: ReportReason;
  note?: string | null;
  block: boolean;
}

export const moderationApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getAccountStatus: builder.query<AccountStatus, void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/account-status', { signal }))),
      providesTags: [{ type: 'Moderation', id: 'me' }],
    }),
    appealAccountStatus: builder.mutation<AccountStatus, void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/account-status/appeal', { signal }))),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(moderationApi.util.upsertQueryData('getAccountStatus', undefined, data));
        } catch {
          dispatch(moderationApi.util.invalidateTags([{ type: 'Moderation', id: 'me' }]));
        }
      },
    }),
    requestAccountReview: builder.mutation<AccountStatus, string>({
      queryFn: (text, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/account-status/review', { body: { text }, signal }))),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(moderationApi.util.upsertQueryData('getAccountStatus', undefined, data));
        } catch {
          dispatch(moderationApi.util.invalidateTags([{ type: 'Moderation', id: 'me' }]));
        }
      },
    }),
    reportUser: builder.mutation<void, ReportUserArgs>({
      queryFn: ({ userId, reason, note, block }, { signal }) => apiTask(async () => {
        contractData(await apiClient.POST('/users/{user_id}/report', {
          params: { path: { user_id: String(userId) } }, body: { reason, note: note || null, block }, signal,
        }));
      }),
      invalidatesTags: (_, error, { block }) => (block && !error ? ['Privacy', 'User', 'Chat'] : []),
    }),
    unreportUser: builder.mutation<void, EntityId>({
      queryFn: (userId, { signal }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/users/{user_id}/report', { params: { path: { user_id: String(userId) } }, signal }));
      }),
    }),
  }),
});

export const {
  useGetAccountStatusQuery,
  useAppealAccountStatusMutation,
  useRequestAccountReviewMutation,
  useReportUserMutation,
  useUnreportUserMutation,
} = moderationApi;
