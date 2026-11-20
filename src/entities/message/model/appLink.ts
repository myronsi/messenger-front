import { emojiSlugFromHref } from '@/entities/emoji';
import { stickerSlugFromHref } from '@/entities/sticker';
import { ownLinkUrl } from '@/shared/lib/ownLink';
import { inviteTokenFromPath, publicNameFromPath } from '@/shared/lib/returnPath';
import { configuredWebOrigin } from '@/shared/lib/webOrigin';

export type AppLink =
  | { kind: 'emoji'; slug: string }
  | { kind: 'sticker'; slug: string }
  | { kind: 'profile'; username: string }
  | { kind: 'name'; name: string }
  | { kind: 'invite'; token: string };

const PROFILE = /^\/dm\/@([A-Za-z0-9_]{3,32})\/?$/;

export const appLinkFrom = (href: string, origin = window.location.origin, configured = configuredWebOrigin()): AppLink | null => {
  const sticker = stickerSlugFromHref(href, origin, configured);
  if (sticker) return { kind: 'sticker', slug: sticker };
  const emoji = emojiSlugFromHref(href, origin, configured);
  if (emoji) return { kind: 'emoji', slug: emoji };
  const url = ownLinkUrl(href, origin, configured);
  if (!url) return null;
  const username = PROFILE.exec(url.pathname)?.[1];
  if (username) return { kind: 'profile', username };
  const name = publicNameFromPath(url.pathname);
  if (name) return { kind: 'name', name };
  const token = inviteTokenFromPath(url.pathname);
  return token ? { kind: 'invite', token } : null;
};
