import { useEffect, useState } from 'react';

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

const getTokenExpiresAt = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + (4 - normalizedPayload.length % 4) % 4, '=');
    const decodedPayload = JSON.parse(atob(paddedPayload));
    return typeof decodedPayload.exp === 'number' ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyTokenListeners(null);
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
      notifyTokenListeners(event.key === null ? null : event.newValue);
    }
  });
}

export const subscribeToAccessToken = (listener: TokenListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Refresh failed');
        const refreshed = await response.json();
        if (!refreshed.access_token) throw new Error('Missing access token');
        setAccessToken(refreshed.access_token);
        return refreshed.access_token as string;
      })
      .catch(() => {
        clearAuthTokens();
        return null;
      })
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
  if (!refreshedToken) return response;

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
