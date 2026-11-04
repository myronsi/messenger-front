import { useEffect, useState } from 'react';
import { clearDrafts } from '@/shared/lib/drafts';
import { getTokenExpiresAt, getTokenSubject } from '@/shared/auth/tokenClaims';
import { getUpdateStatus } from '@/shared/api/updateGate';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const DEVICE_PART_KEYS = ['device_part', 'device_parts'];
const RECOVERY_SESSION_KEYS = ['recovery_username', 'recovery_cloud_part', 'recovery_device_part', 'recovery_token'];

type TokenListener = (token: string | null) => void;

const listeners = new Set<TokenListener>();
let refreshPromise: Promise<string | null> | null = null;

const notifyTokenListeners = (token: string | null) => {
  listeners.forEach((listener) => listener(token));
};

const isTokenExpired = (token: string, skewMs = 30_000) => {
  const expiresAt = getTokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= Date.now() + skewMs;
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setAccessToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  notifyTokenListeners(token);
};

export const clearAuthTokens = () => {
  window.dispatchEvent(new Event('messenger:logout'));
  clearDrafts();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyTokenListeners(null);
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

export const endSession = () => {
  clearStoredRecoveryParts();
  clearAuthTokens();
};

// Another tab logging out or in changes the token; follow it so this tab does not keep the old user's data.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === ACCESS_TOKEN_KEY || event.key === null) {
      if (!event.newValue) clearDrafts();
      notifyTokenListeners(event.key === null ? null : event.newValue);
    }
  });
}

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
  const sameAccount = (token: string) => {
    const subject = getTokenSubject(token);
    return !startedAs || !subject || subject === startedAs;
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
  if (response.status === 401 || response.status === 403) {
    const refreshedElsewhere = newerToken();
    if (refreshedElsewhere) return refreshedElsewhere;
    dropInvalidSession();
    return null;
  }
  if (!response.ok) return null;
  const refreshed = await response.json();
  if (!refreshed.access_token) return null;
  setAccessToken(refreshed.access_token);
  return refreshed.access_token as string;
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    const startedWith = getAccessToken();
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

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = await ensureAccessToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401) return response;

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    if (getAccessToken()) throw new Error('The session could not be refreshed right now');
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
  return fetch(input, { ...init, headers: retryHeaders });
};

export const useAccessToken = () => {
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    const unsubscribe = subscribeToAccessToken(setToken);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY) {
        setToken(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return token;
};
