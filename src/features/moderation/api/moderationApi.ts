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
export type ContentReportReason = Schema['ContentReportReason'];
export type ModerationReason = Schema['ModerationReason'];
export type ReportOutcome = Schema['ReportOutcome'];
export type ReportOutcomeList = Schema['ReportOutcomeList'];

export interface ReportUserArgs {
  userId: EntityId;
  reason: ReportReason;
  note?: string | null;
  block: boolean;
}

export interface ReportMessageArgs {
  chatId: EntityId;
  messageId: EntityId;
  reason: ContentReportReason;
  note?: string | null;
}

export interface ReportGroupArgs {
  chatId: EntityId;
  reason: ContentReportReason;
  note?: string | null;
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
    listReportOutcomes: builder.query<ReportOutcomeList, void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/report-outcomes', { signal }))),
      providesTags: [{ type: 'Moderation', id: 'outcomes' }],
    }),
    markReportOutcomeRead: builder.mutation<void, string>({
      queryFn: (id, { signal }) => apiTask(async () => {
        contractData(await apiClient.POST('/me/report-outcomes/{outcome_id}/read', { params: { path: { outcome_id: id } }, signal }));
      }),
      onQueryStarted(id, { dispatch }) {
        dispatch(moderationApi.util.updateQueryData('listReportOutcomes', undefined, (draft) => {
          draft.items.forEach((item) => { if (item.id === id) item.read = true; });
        }));
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
    reportMessage: builder.mutation<void, ReportMessageArgs>({
      queryFn: ({ chatId, messageId, reason, note }, { signal }) => apiTask(async () => {
        contractData(await apiClient.POST('/chats/{chat_id}/messages/{message_id}/report', {
          params: { path: { chat_id: String(chatId), message_id: String(messageId) } }, body: { reason, note: note || null }, signal,
        }));
      }),
    }),
    reportGroup: builder.mutation<void, ReportGroupArgs>({
      queryFn: ({ chatId, reason, note }, { signal }) => apiTask(async () => {
        contractData(await apiClient.POST('/groups/{chat_id}/report', {
          params: { path: { chat_id: String(chatId) } }, body: { reason, note: note || null }, signal,
        }));
      }),
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
  useListReportOutcomesQuery,
  useMarkReportOutcomeReadMutation,
  useReportUserMutation,
  useUnreportUserMutation,
  useReportMessageMutation,
  useReportGroupMutation,
} = moderationApi;
