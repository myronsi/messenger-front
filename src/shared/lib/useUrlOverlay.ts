import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { joinOverlayPath, parentOverlay, splitOverlayPath, type UrlOverlay } from './urlOverlay';

export const useUrlOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { base, overlay } = useMemo(() => splitOverlayPath(location.pathname), [location.pathname]);

  const go = useCallback((next: UrlOverlay | null, replace: boolean) => {
    const current = splitOverlayPath(window.location.pathname);
    const pathname = joinOverlayPath(current.base, next);
    if (pathname === window.location.pathname) return;
    navigate({ pathname, search: window.location.search, hash: window.location.hash }, { replace, state: window.history.state?.usr });
  }, [navigate]);

  const open = useCallback((next: UrlOverlay) => go(next, false), [go]);
  const replace = useCallback((next: UrlOverlay) => go(next, true), [go]);
  const close = useCallback(() => go(parentOverlay(splitOverlayPath(window.location.pathname).overlay), true), [go]);
  const closeAll = useCallback(() => go(null, true), [go]);

  return { base, overlay, open, replace, close, closeAll };
};
