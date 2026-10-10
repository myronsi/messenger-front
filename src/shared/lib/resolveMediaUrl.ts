import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { toAbsoluteMediaUrl } from '@/shared/api/media';

// Resolves a media path returned by the API (host-relative, e.g. "/api/v2/users/1/avatar?version=2") to a
// full URL on the API's origin. Absolute, blob: and data: URLs are returned unchanged. API media still needs
// the access token: render it with MediaImg or useMediaSrc (src/shared/api/media.ts).
export const resolveMediaUrl = (path?: string | null, fallback: string = DEFAULT_AVATAR): string => (
  path ? toAbsoluteMediaUrl(path) : fallback
);
