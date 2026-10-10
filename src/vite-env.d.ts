/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The v2 API root, e.g. https://chat.example.com/api/v2 (src/shared/api/apiUrl.ts).
  readonly VITE_API_URL?: string;
  // The v1 deployments' variable; still accepted (host root, /api prefix or the /api/v2 root).
  readonly VITE_BASE_URL?: string;
  // Where the WebSocket connects when it is not the API root's host (ws:// or wss://).
  readonly VITE_WS_URL?: string;
  readonly VITE_CLIENT_API_VERSION?: string;
  readonly VITE_API_MOCK?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;