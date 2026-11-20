import { qrLoginRequestId } from './qrLoginPath';
import { trimTrailingSlashes } from './trimTrailingSlashes';

export const PUBLIC_NAME = /^[A-Za-z0-9_]{3,32}$/;
export const INVITE_TOKEN = /^[A-Za-z0-9]{22}$/;

const DEEP_LINKS = [
  /^\/@[A-Za-z0-9_]{3,32}$/,
  /^\/dm\/@[A-Za-z0-9_]{3,32}$/,
  /^\/join\/[A-Za-z0-9]{22}$/,
  /^\/stickers\/[A-Za-z0-9]{8,32}$/,
  /^\/emoji\/[A-Za-z0-9]{8,32}$/,
];
const CHAT = /^\/chat\/[1-9]\d*$/;

export const publicNameFromPath = (pathname: string) => {
  const match = trimTrailingSlashes(pathname).match(/^\/@([^/]+)$/);
  return match && PUBLIC_NAME.test(match[1]) ? match[1] : null;
};

export const inviteTokenFromPath = (pathname: string) => {
  const match = trimTrailingSlashes(pathname).match(/^\/join\/([^/]+)$/);
  return match && INVITE_TOKEN.test(match[1]) ? match[1] : null;
};

const destination = (pathname: string, search: string) => {
  const path = pathname.length > 1 ? trimTrailingSlashes(pathname) : pathname;
  if (DEEP_LINKS.some((pattern) => pattern.test(path)) || qrLoginRequestId(path)) return path;
  if (!CHAT.test(path)) return '/';
  const params = new URLSearchParams(search);
  if (params.get('notification') !== '1') return path;
  return `${path}?notification=1${params.get('reply') === '1' ? '&reply=1' : ''}`;
};

export function returnPath(pathname: string, search: string, state?: unknown) {
  const direct = destination(pathname, search);
  if (direct !== '/') return direct;
  if (typeof state !== 'object' || state === null || !('returnPath' in state) || typeof state.returnPath !== 'string') return '/';
  const [savedPath, savedSearch = ''] = state.returnPath.split('?');
  return destination(savedPath, savedSearch);
}
