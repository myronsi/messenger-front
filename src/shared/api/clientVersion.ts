import { API_VERSION } from '@myronsi/messenger-api';
import { APP_VERSION } from '@/shared/lib/appVersion';

export const CLIENT_VERSION_HEADER = 'X-Client-Version';
export const CLIENT_API_VERSION_HEADER = 'X-Client-Api-Version';

// The contract version the client sends. It defaults to the version of the installed contract package;
// deployments against a backend that still implements an older contract override it with VITE_CLIENT_API_VERSION.
export const CLIENT_API_VERSION: string = (import.meta.env.VITE_CLIENT_API_VERSION as string | undefined)?.trim() || API_VERSION;

export const CLIENT_APP_VERSION: string = APP_VERSION;

export const clientVersionHeaders = (): Record<string, string> => ({
  [CLIENT_VERSION_HEADER]: CLIENT_APP_VERSION,
  [CLIENT_API_VERSION_HEADER]: CLIENT_API_VERSION,
});