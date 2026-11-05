// VITE_BASE_URL remains a deployment compatibility alias. New builds use VITE_API_URL.
export const getApiBaseUrl = () => String(import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || '/api/v2').replace(/\/+$/, '');

export const apiUrl = (path = '') => `${getApiBaseUrl()}${path && !path.startsWith('/') ? '/' : ''}${path}`;

export const getWebSocketOrigin = () => String(import.meta.env.VITE_WS_URL || '').replace(/\/+$/, '');
