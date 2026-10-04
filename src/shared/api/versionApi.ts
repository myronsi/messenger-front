import { messengerApi } from '@/shared/api/baseApi';
import type { components } from '@/shared/api/generated/schema';

export interface ServerVersionInfo {
  serverVersion: string;
  commit?: string;
  apiVersion?: string;
  minClientApiVersion?: string;
}

interface PythonVersionResponse {
  version: string;
  commit?: string;
}

type MetaResponse = Partial<components['schemas']['Meta']>;

export const versionApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getServerVersion: builder.query<ServerVersionInfo, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const legacy = await fetchWithBQ('/version');
        if (legacy.data) {
          const { version, commit } = legacy.data as PythonVersionResponse;
          return { data: { serverVersion: version, commit } };
        }

        // The v2 contract is served under /api/v2: the base URL is either the host root or already ends in /api/v2.
        const meta = await fetchWithBQ('/api/v2/meta');
        const metaFromBase = meta.data ? meta : await fetchWithBQ('/meta');
        if (metaFromBase.data) {
          const { backend_version, commit, api_version, min_client_api_version } = metaFromBase.data as MetaResponse;
          return { data: { serverVersion: backend_version ?? '', commit, apiVersion: api_version, minClientApiVersion: min_client_api_version } };
        }

        return { error: metaFromBase.error ?? legacy.error! };
      },
    }),
  }),
});

export const { useGetServerVersionQuery } = versionApi;
