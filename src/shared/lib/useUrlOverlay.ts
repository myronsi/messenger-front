import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { joinOverlayPath, parentOverlay, splitOverlayPath, type UrlOverlay } from './urlOverlay';

type EntryMarks = { settingsOpened?: boolean; settingsDepth?: number; settingsChain?: number };

export const currentEntryMarks = (): EntryMarks => {
  const state = window.history.state?.usr;
  return state && typeof state === 'object' ? state : {};
};

export const useUrlOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { base, overlay } = useMemo(() => splitOverlayPath(location.pathname), [location.pathname]);

  const go = useCallback((next: UrlOverlay | null, replace: boolean, marks?: EntryMarks) => {
    const current = splitOverlayPath(window.location.pathname);
    const pathname = joinOverlayPath(current.base, next);
    if (pathname === window.location.pathname) return;
    const state = marks ? { ...currentEntryMarks(), ...marks } : window.history.state?.usr;
    navigate({ pathname, search: window.location.search, hash: window.location.hash }, { replace, state });
  }, [navigate]);

  const open = useCallback((next: UrlOverlay, marks?: EntryMarks) => go(next, false, marks), [go]);
  const replace = useCallback((next: UrlOverlay) => go(next, true), [go]);
  const close = useCallback(() => go(parentOverlay(splitOverlayPath(window.location.pathname).overlay), true), [go]);
  const closeAll = useCallback(() => go(null, true), [go]);

  return { base, overlay, open, replace, close, closeAll };
};
