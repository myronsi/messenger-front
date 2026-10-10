import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { dropInvalidSession, getAccessToken, refreshAccessToken } from '@/shared/auth/session';
import { API_ROOT } from '@/shared/api/apiUrl';

// Endpoints use paths of the v2 contract ('/chats'); errors arrive as the contract's Problem in `error.data`
// (read them with apiErrorMessage / apiErrorCode from '@/shared/lib/apiError').
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_ROOT,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// The account endpoints answer 401 for wrong credentials or an expired refresh cookie: that is their answer,
// not an expired access token, so it must not trigger a refresh (which could revive another session) and a
// repeat of the request.
const AUTH_PATH = /^\/auth\//;
const pathOf = (args: string | FetchArgs) => (typeof args === 'string' ? args : args.url);

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !AUTH_PATH.test(pathOf(args))) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      dropInvalidSession();
    }
  }

  return result;
};

export const messengerApi = createApi({
  reducerPath: 'messengerApi',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['User', 'Chat', 'Message', 'Auth', 'Avatar', 'Privacy', 'Request'],
  endpoints: () => ({}),
});
