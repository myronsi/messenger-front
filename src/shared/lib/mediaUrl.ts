import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { toAbsoluteMediaUrl } from '@/shared/api/media';

// mediaUrl is the one way to turn an avatar or attachment path into a URL: a path the API returned
// (host-relative, e.g. "/api/v2/users/1/avatar?version=2") becomes a full URL on the API's origin, a missing
// one the fallback (the default avatar); absolute, blob: and data: URLs are returned unchanged. API media
// still needs the access token: render it with MediaImg or useMediaSrc (src/shared/api/media.ts).
export const mediaUrl = (path?: string | null, fallback: string = DEFAULT_AVATAR): string => (
  path ? toAbsoluteMediaUrl(path) : fallback
);
