import { messengerApi } from '@/shared/api/baseApi';
import type { components } from '@/shared/api/generated/schema';

export interface ServerVersionInfo {
  serverVersion: string;
  commit?: string;
  apiVersion?: string;
  minClientApiVersion?: string;
}

type Meta = components['schemas']['Meta'];

export const versionApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getServerVersion: builder.query<ServerVersionInfo, void>({
      query: () => '/meta',
      transformResponse: (meta: Meta) => ({
        serverVersion: meta.backend_version,
        commit: meta.commit,
        apiVersion: meta.api_version,
        minClientApiVersion: meta.min_client_api_version,
      }),
    }),
  }),
});

export const { useGetServerVersionQuery } = versionApi;
