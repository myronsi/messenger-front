import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { getApiBaseUrl } from './config';
import { contractFetch } from './contractFetch';
import { sessionFetch } from '@/shared/auth/session';

export const apiClient = createClient<paths>({
  baseUrl: new URL(getApiBaseUrl(), window.location.origin).href,
  credentials: 'include',
  fetch: (request) => sessionFetch(contractFetch, request),
});

export const publicApiClient = createClient<paths>({
  baseUrl: new URL(getApiBaseUrl(), window.location.origin).href,
  credentials: 'include',
  fetch: contractFetch,
});
