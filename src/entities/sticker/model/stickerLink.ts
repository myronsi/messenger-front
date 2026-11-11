import { configuredWebOrigin } from '@/shared/lib/webOrigin';

const SLUG = /^\/stickers\/([A-Za-z0-9]{8,32})\/?$/;

export const stickerLinkSlug = (pathname: string) => pathname.match(SLUG)?.[1] ?? null;

export const stickerSlugFromHref = (href: string, origin = window.location.origin, configured = configuredWebOrigin()) => {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin && url.origin !== configured) return null;
    return stickerLinkSlug(url.pathname);
  } catch {
    return null;
  }
};
