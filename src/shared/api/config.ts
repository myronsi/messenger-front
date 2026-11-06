import { trimTrailingSlashes } from '@/shared/lib/trimTrailingSlashes';
// VITE_BASE_URL remains a deployment compatibility alias. New builds use VITE_API_URL.
export const getApiBaseUrl = () => trimTrailingSlashes(String(import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || '/api/v2'));

export const apiUrl = (path = '') => `${getApiBaseUrl()}${path && !path.startsWith('/') ? '/' : ''}${path}`;

export const getWebSocketOrigin = () => trimTrailingSlashes(String(import.meta.env.VITE_WS_URL || ''));
