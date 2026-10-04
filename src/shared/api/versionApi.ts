import { messengerApi } from '@/shared/api/baseApi';
import type { components } from '@/shared/api/generated/schema';
import { getMetaPath } from '@/shared/api/metaPath';

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

        const meta = await fetchWithBQ(getMetaPath(import.meta.env.VITE_BASE_URL));
        if (meta.data) {
          const { backend_version, commit, api_version, min_client_api_version } = meta.data as MetaResponse;
          return { data: { serverVersion: backend_version ?? '', commit, apiVersion: api_version, minClientApiVersion: min_client_api_version } };
        }

        return { error: meta.error ?? legacy.error! };
      },
    }),
  }),
});

export const { useGetServerVersionQuery } = versionApi;
