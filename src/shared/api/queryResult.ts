import type { FetchBaseQueryError, QueryReturnValue } from '@reduxjs/toolkit/query';

// Keep network exceptions out of Redux; callers receive the same error shape as
// fetchBaseQuery, including the server's typed problem body on HTTP failures.
export const contractQuery = async <T>(request: () => Promise<{ data?: T; error?: unknown; response: Response }>):
Promise<QueryReturnValue<T, FetchBaseQueryError, undefined>> => {
  try {
    const result = await request();
    if (!result.response.ok) return { error: { status: result.response.status, data: result.error } };
    if (result.data === undefined) return { error: { status: 'CUSTOM_ERROR', error: 'The server returned an empty response.' } };
    return { data: result.data };
  } catch { return { error: { status: 'FETCH_ERROR', error: 'Unable to reach the server.' } }; }
};
