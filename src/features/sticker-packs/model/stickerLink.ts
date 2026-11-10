const SLUG = /^\/stickers\/([A-Za-z0-9]{8,32})\/?$/;

export const stickerLinkSlug = (pathname: string) => pathname.match(SLUG)?.[1] ?? null;
