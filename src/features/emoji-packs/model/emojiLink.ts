const ROUTE = /^\/emoji\/([A-Za-z0-9]{8,32})\/?$/;

export const emojiLinkSlug = (pathname: string) => ROUTE.exec(pathname)?.[1] ?? null;
