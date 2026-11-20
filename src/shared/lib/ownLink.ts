import { configuredWebOrigin } from './webOrigin';
import { publicNameFromPath } from './returnPath';
import { joinOverlayPath, splitOverlayPath } from './urlOverlay';

export const ownLinkUrl = (href: string, origin = window.location.origin, configured = configuredWebOrigin()) => {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin && url.origin !== configured) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
};

export const navigateInApp = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const inAppPath = (url: URL, current = window.location.pathname) => {
  const name = publicNameFromPath(url.pathname);
  if (!name) return `${url.pathname}${url.search}${url.hash}`;
  return joinOverlayPath(splitOverlayPath(current).base, { kind: 'user', username: name });
};

export const openOwnLink = (href: string) => {
  const url = ownLinkUrl(href);
  if (!url) return false;
  navigateInApp(inAppPath(url));
  return true;
};
