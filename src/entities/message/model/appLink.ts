import { emojiSlugFromHref } from '@/entities/emoji';
import { stickerSlugFromHref } from '@/entities/sticker';
import { configuredWebOrigin } from '@/shared/lib/webOrigin';

export type AppLink =
  | { kind: 'emoji'; slug: string }
  | { kind: 'sticker'; slug: string }
  | { kind: 'profile'; username: string };

const PROFILE = /^\/dm\/@([A-Za-z0-9_]{3,32})\/?$/;

const profileFromHref = (href: string, origin: string, configured: string | null) => {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin && url.origin !== configured) return null;
    return PROFILE.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const appLinkFrom = (href: string, origin = window.location.origin, configured = configuredWebOrigin()): AppLink | null => {
  const sticker = stickerSlugFromHref(href, origin, configured);
  if (sticker) return { kind: 'sticker', slug: sticker };
  const emoji = emojiSlugFromHref(href, origin, configured);
  if (emoji) return { kind: 'emoji', slug: emoji };
  const username = profileFromHref(href, origin, configured);
  return username ? { kind: 'profile', username } : null;
};
