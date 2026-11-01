import { authFetch } from '@/shared/auth/session';
import { isBackendRequest } from './clientVersionFetch';

// Only our backend receives the account's bearer token, including for legacy external media URLs.
export const fetchMedia = (url: string, init?: RequestInit) =>
  isBackendRequest(url) ? authFetch(url, init) : fetch(url, init);
