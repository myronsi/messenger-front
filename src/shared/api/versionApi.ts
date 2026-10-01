import { messengerApi } from '@/shared/api/baseApi';

export interface ServerVersionInfo {
  serverVersion: string;
  commit?: string;
  apiVersion?: string;
}

interface PythonVersionResponse {
  version: string;
  commit?: string;
}

interface MetaResponse {
  backend_version: string;
  commit?: string;
  api_version?: string;
}

export const versionApi = messengerApi.injectEndpoints({
  endpoints: (builder) => ({
    getServerVersion: builder.query<ServerVersionInfo, void>({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const legacy = await fetchWithBQ('/version');
        if (legacy.data) {
          const { version, commit } = legacy.data as PythonVersionResponse;
          return { data: { serverVersion: version, commit } };
        }

        const meta = await fetchWithBQ('/api/v2/meta');
        if (meta.data) {
          const { backend_version, commit, api_version } = meta.data as MetaResponse;
          return { data: { serverVersion: backend_version, commit, apiVersion: api_version } };
        }

        return { error: meta.error ?? legacy.error! };
      },
    }),
  }),
});

export const { useGetServerVersionQuery } = versionApi;
