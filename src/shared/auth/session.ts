import { getApiBaseUrl } from '@/shared/api/config';
import { useEffect, useState } from 'react';
import { clearDrafts } from '@/shared/lib/drafts';
import { clearUnsentMessages } from '@/shared/lib/unsentMessages';
import { forgetSignedInUser } from '@/shared/auth/signedInUser';
import { getTokenExpiresAt, getTokenSession, getTokenSubject, hasSessionChanged } from '@/shared/auth/tokenClaims';
import { getUpdateStatus } from '@/shared/api/updateGate';
import { isStaleDeviceProof } from '@/shared/api/deviceProofFetch';
import { forgetCachedDeviceKey, forgetDeviceKey } from '@/shared/auth/deviceKey';

const BASE_URL = getApiBaseUrl();
const LEGACY_ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_MARKER_KEY = 'had_session';
const SESSION_MARKER_CHECKED_KEY = 'had_session_checked';
const DEVICE_PART_KEYS = ['device_part', 'device_parts'];
const RECOVERY_SESSION_KEYS = ['recovery_username', 'recovery_cloud_part', 'recovery_device_part', 'recovery_token'];
const AUTH_CHANNEL = 'auth';

type TokenListener = (token: string | null) => void;
type AuthMessage = { type: 'token'; token: string } | { type: 'logout' };

const listeners = new Set<TokenListener>();
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const notifyTokenListeners = (token: string | null) => {
  listeners.forEach((listener) => listener(token));
};

const isTokenExpired = (token: string, skewMs = 30_000) => {
  const expiresAt = getTokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= Date.now() + skewMs;
};

export const getAccessToken = () => accessToken;

const markSession = (active: boolean) => {
  try {
    if (active) localStorage.setItem(SESSION_MARKER_KEY, '1');
    else localStorage.removeItem(SESSION_MARKER_KEY);
    localStorage.setItem(SESSION_MARKER_CHECKED_KEY, '1');
  } catch {
    return;
  }
};

export const expectsRefreshSession = () => {
  try {
    return localStorage.getItem(SESSION_MARKER_KEY) === '1';
  } catch {
    return false;
  }
};

export const mayHaveRefreshSession = () => {
  try {
    return localStorage.getItem(SESSION_MARKER_KEY) === '1' || localStorage.getItem(SESSION_MARKER_CHECKED_KEY) !== '1';
  } catch {
    return true;
  }
};

const authChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL);

const broadcast = (message: AuthMessage) => {
  try {
    authChannel?.postMessage(message);
  } catch {
    return;
  }
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  markSession(Boolean(token));
  notifyTokenListeners(token);
  broadcast(token ? { type: 'token', token } : { type: 'logout' });
};

export const clearAuthTokens = () => {
  window.dispatchEvent(new Event('messenger:logout'));
  clearDrafts();
  clearUnsentMessages();
  forgetSignedInUser();
  accessToken = null;
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  markSession(false);
  notifyTokenListeners(null);
  broadcast({ type: 'logout' });
};

// For failures that suggest the session is invalid (refresh or "who am I" failed). When the server answered
// 426 client_outdated the credentials and drafts are fine; they must survive the reload that installs the update.
export const dropInvalidSession = () => {
  if (getUpdateStatus() === 'required') return;
  clearAuthTokens();
};

// The device recovery share must not outlive an explicit logout or account deletion.
export const clearStoredRecoveryParts = () => {
  DEVICE_PART_KEYS.forEach((key) => localStorage.removeItem(key));
  RECOVERY_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
};

export const endSession = ({ keepDeviceKey = false }: { keepDeviceKey?: boolean } = {}) => {
  clearStoredRecoveryParts();
  clearAuthTokens();
  if (!keepDeviceKey) void forgetDeviceKey();
};

const followOtherTab = (message: AuthMessage) => {
  if (message.type === 'token') {
    if (message.token === accessToken) return;
    accessToken = message.token;
    notifyTokenListeners(message.token);
    return;
  }
  if (message.type !== 'logout') return;
  forgetCachedDeviceKey();
  const hadToken = accessToken !== null;
  accessToken = null;
  clearDrafts();
  clearUnsentMessages();
  if (hadToken) notifyTokenListeners(null);
};

authChannel?.addEventListener('message', (event: MessageEvent<AuthMessage | null>) => {
  if (event.data && typeof event.data === 'object') followOtherTab(event.data);
});

const forgetLegacyAccessToken = () => {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } catch {
    return;
  }
};

forgetLegacyAccessToken();

export const subscribeToAccessToken = (listener: TokenListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const withRefreshLock = async <T>(task: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks?.request) return task();
  return locks.request('auth-refresh', task);
};

const requestRefresh = async (startedWith: string | null) => {
  const startedAs = getTokenSubject(startedWith);
  const startedSession = getTokenSession(startedWith);
  const sameAccount = (token: string) => {
    const subject = getTokenSubject(token);
    return (!startedAs || !subject || subject === startedAs) &&
      (!startedSession || getTokenSession(token) === startedSession);
  };
  const sessionEnded = () => {
    const current = getAccessToken();
    return Boolean(startedWith) && (!current || !sameAccount(current));
  };
  const newerToken = () => {
    const current = getAccessToken();
    return current && current !== startedWith && sameAccount(current) && !isTokenExpired(current) ? current : null;
  };
  const alreadyRefreshed = newerToken();
  if (alreadyRefreshed) return alreadyRefreshed;
  if (sessionEnded()) return null;
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (sessionEnded()) return null;
  if (await isStaleDeviceProof(response)) return null;
  if (response.status === 401 || response.status === 403) {
    const refreshedElsewhere = newerToken();
    if (refreshedElsewhere) return refreshedElsewhere;
    dropInvalidSession();
    return null;
  }
  if (!response.ok) return null;
  const refreshed = await response.json();
  if (!refreshed.access_token || sessionEnded()) return null;
  const current = getAccessToken();
  if (current && current !== startedWith && hasSessionChanged(current, refreshed.access_token)) return null;
  if (!sameAccount(refreshed.access_token)) {
    dropInvalidSession();
    return null;
  }
  setAccessToken(refreshed.access_token);
  return refreshed.access_token as string;
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    const startedWith = getAccessToken();
    if (!startedWith && !mayHaveRefreshSession()) return null;
    refreshPromise = withRefreshLock(() => requestRefresh(startedWith))
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const ensureAccessToken = async () => {
  const token = getAccessToken();
  if (token && !isTokenExpired(token)) return token;
  return refreshAccessToken();
};

const asksForSecondFactor = async (response: Response) => {
  if (!response.headers.get('content-type')?.includes('json')) return false;
  try {
    const body = await response.clone().json();
    return body?.code === 'two_factor_required';
  } catch {
    return false;
  }
};

export const sessionFetch = async (fetcher: typeof fetch, input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = await ensureAccessToken();
  if (!token && expectsRefreshSession()) throw new Error('The session could not be refreshed right now');
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  const retryInput = input instanceof Request ? input.clone() : input;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetcher(input, { ...init, headers });
  if (response.status !== 401 || await asksForSecondFactor(response)) return response;

  const current = getAccessToken();
  if (!token) {
    if (current) throw new Error('The session could not be refreshed right now');
    return response;
  }
  if (!current || hasSessionChanged(token, current)) throw new Error('The session changed during the request');

  const refreshedToken = current !== token && !isTokenExpired(current) ? current : await refreshAccessToken();
  if (!refreshedToken) {
    if (getAccessToken()) throw new Error('The session could not be refreshed right now');
    return response;
  }

  if (hasSessionChanged(token, refreshedToken) || getAccessToken() !== refreshedToken) {
    throw new Error('The session changed during the request');
  }
  const retryHeaders = new Headers(headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
  const retry = await fetcher(retryInput, { ...init, headers: retryHeaders });
  if (retry.status === 401 && !(await asksForSecondFactor(retry)) && getAccessToken() === refreshedToken) dropInvalidSession();
  return retry;
};

export const authFetch: typeof fetch = (input, init) => sessionFetch(fetch, input, init);

export const useAccessToken = () => {
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    setToken(getAccessToken());
    const unsubscribe = subscribeToAccessToken(setToken);
    return () => {
      unsubscribe();
    };
  }, []);

  return token;
};
