/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_API_VERSION?: string;
  readonly VITE_API_MOCK?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;