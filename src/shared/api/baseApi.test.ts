import { configureStore } from '@reduxjs/toolkit';
import { afterEach, expect, it, vi } from 'vitest';
import { refreshAccessToken } from '@/shared/auth/session';
import { messengerApi } from './baseApi';
import { problemCode } from './problem';

vi.mock('@/shared/api/config', () => ({ getApiBaseUrl: () => 'https://api.test/api/v2' }));
vi.mock('@/shared/auth/session', () => ({ getAccessToken: () => 'token', refreshAccessToken: vi.fn(async () => 'fresh') }));

const probeApi = messengerApi.injectEndpoints({
  endpoints: build => ({ probe: build.mutation<unknown, void>({ query: () => ({ url: '/me/recovery-key', method: 'POST' }) }) }),
});
const problem = (code: string) => new Response(JSON.stringify({ code, status: 401 }), {
  status: 401, headers: { 'Content-Type': 'application/problem+json' },
});
const store = () => configureStore({
  reducer: { [messengerApi.reducerPath]: messengerApi.reducer },
  middleware: getDefault => getDefault().concat(messengerApi.middleware),
});

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('passes a missing second factor to the caller without refreshing the session', async () => {
  const fetcher = vi.fn(async () => problem('two_factor_required'));
  vi.stubGlobal('fetch', fetcher);
  const result = await store().dispatch(probeApi.endpoints.probe.initiate());
  expect(refreshAccessToken).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect('error' in result && problemCode(result.error)).toBe('two_factor_required');
});

it('still refreshes the session and repeats the request on an expired token', async () => {
  const fetcher = vi.fn(async () => problem('unauthenticated'));
  vi.stubGlobal('fetch', fetcher);
  await store().dispatch(probeApi.endpoints.probe.initiate());
  expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
