import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { clearAuthTokens, getAccessToken, refreshAccessToken } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      clearAuthTokens();
    }
  }

  return result;
};

export const messengerApi = createApi({
  reducerPath: 'messengerApi',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['User', 'Chat', 'Message', 'Auth', 'Avatar', 'Privacy'],
  endpoints: () => ({}),
});
