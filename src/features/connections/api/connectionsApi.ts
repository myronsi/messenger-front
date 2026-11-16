import { apiClient } from '@/shared/api/client';
import { apiTask, contractData } from '@/shared/api/tasks';
import { messengerApi } from '@/shared/api/baseApi';
import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];
export type Connection = Schema['Connection'];
export type ConnectionProvider = Schema['ConnectionProvider'];
export type ConnectionChallenge = Schema['ConnectionChallenge'];

export const connectionsApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getConnectionProviders: builder.query<ConnectionProvider[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/meta', { signal })).connection_providers ?? []),
    }),
    getMyConnections: builder.query<Connection[], void>({
      queryFn: (_, { signal }) => apiTask(async () => contractData(await apiClient.GET('/me/connections', { signal })).items),
      providesTags: [{ type: 'Connection', id: 'me' }],
    }),
    getUserConnections: builder.query<Connection[], string>({
      queryFn: (userId, { signal }) => apiTask(async () => contractData(await apiClient.GET('/users/{user_id}/connections', {
        params: { path: { user_id: userId } }, signal,
      })).items),
      providesTags: (_, __, userId) => [{ type: 'Connection', id: userId }],
    }),
    reorderConnections: builder.mutation<Connection[], string[]>({
      queryFn: (ids, { signal }) => apiTask(async () => contractData(await apiClient.PUT('/me/connections/order', { body: { ids }, signal })).items),
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(connectionsApi.util.updateQueryData('getMyConnections', undefined, (draft) => {
          const order = new Map(ids.map((id, index) => [id, index]));
          draft.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        }));
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'Connection', id: 'me' }],
    }),
    deleteConnection: builder.mutation<void, string>({
      queryFn: (id, { signal }) => apiTask(async () => {
        contractData(await apiClient.DELETE('/me/connections/{connection_id}', { params: { path: { connection_id: id } }, signal }));
      }),
      invalidatesTags: [{ type: 'Connection', id: 'me' }],
    }),
    startConnection: builder.mutation<string, ConnectionProvider>({
      queryFn: (provider, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/connections/{provider}/start', {
        params: { path: { provider } }, signal,
      })).redirect_url),
    }),
    claimConnection: builder.mutation<ConnectionChallenge, { provider: ConnectionProvider; identifier: string }>({
      queryFn: ({ provider, identifier }, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/connections/{provider}/claim', {
        params: { path: { provider } }, body: { identifier }, signal,
      }))),
    }),
    verifyConnection: builder.mutation<Connection, ConnectionProvider>({
      queryFn: (provider, { signal }) => apiTask(async () => contractData(await apiClient.POST('/me/connections/{provider}/verify', {
        params: { path: { provider } }, signal,
      }))),
      invalidatesTags: [{ type: 'Connection', id: 'me' }],
    }),
  }),
});

export const {
  useGetConnectionProvidersQuery, useGetMyConnectionsQuery, useGetUserConnectionsQuery, useReorderConnectionsMutation,
  useDeleteConnectionMutation, useStartConnectionMutation, useClaimConnectionMutation, useVerifyConnectionMutation,
} = connectionsApi;
