import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isMobileComposer } from './composerFocus';
import { useLatestRef } from './useLatestRef';

type EntryState = Record<string, unknown>;

const stateOf = (state: unknown): EntryState => (state && typeof state === 'object' ? state as EntryState : {});

let openings = 0;

export const useBackToClose = (active: boolean, close: () => void, flag: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useLatestRef(location);
  const closeRef = useLatestRef(close);
  const token = useRef<string | null>(null);
  const ownedKey = useRef<string | null>(null);
  const staleKey = useRef<string | null>(null);

  useEffect(() => {
    const current = locationRef.current;
    if (active && !token.current && isMobileComposer()) {
      openings += 1;
      token.current = `${flag}-${openings}`;
      const { pathname, search, hash } = current;
      navigate({ pathname, search, hash }, { state: { ...stateOf(current.state), [flag]: token.current } });
    } else if (!active && token.current) {
      const owned = ownedKey.current;
      token.current = null;
      ownedKey.current = null;
      if (owned && current.key === owned) navigate(-1);
      else if (owned) staleKey.current = owned;
    }
  }, [active, flag, navigate, locationRef]);

  useEffect(() => {
    if (staleKey.current && location.key === staleKey.current) {
      staleKey.current = null;
      navigate(-1);
      return;
    }
    if (!token.current) return;
    const mine = stateOf(location.state)[flag] === token.current;
    if (!ownedKey.current) {
      if (mine) ownedKey.current = location.key;
      return;
    }
    if (!mine) {
      token.current = null;
      ownedKey.current = null;
      closeRef.current();
    }
  }, [location, flag, navigate, closeRef]);
};
