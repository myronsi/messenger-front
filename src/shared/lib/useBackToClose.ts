import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isMobileComposer } from './composerFocus';
import { useLatestRef } from './useLatestRef';

type EntryState = Record<string, unknown>;

const stateOf = (state: unknown): EntryState => (state && typeof state === 'object' ? state as EntryState : {});

export const useBackToClose = (active: boolean, close: () => void, flag: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useLatestRef(location);
  const closeRef = useLatestRef(close);
  const pending = useRef(false);
  const ownedKey = useRef<string | null>(null);
  const staleKey = useRef<string | null>(null);

  useEffect(() => {
    const current = locationRef.current;
    if (active && !pending.current && !ownedKey.current && isMobileComposer()) {
      pending.current = true;
      const { pathname, search, hash } = current;
      navigate({ pathname, search, hash }, { state: { ...stateOf(current.state), [flag]: true } });
    } else if (!active && (pending.current || ownedKey.current)) {
      const owned = ownedKey.current;
      pending.current = false;
      ownedKey.current = null;
      if (owned && current.key === owned) navigate(-1);
      else if (owned) staleKey.current = owned;
    }
  }, [active, flag, navigate, locationRef]);

  useEffect(() => {
    const flagged = !!stateOf(location.state)[flag];
    if (staleKey.current && location.key === staleKey.current) {
      staleKey.current = null;
      navigate(-1);
      return;
    }
    if (pending.current && flagged) {
      pending.current = false;
      ownedKey.current = location.key;
      return;
    }
    if (ownedKey.current && !flagged) {
      ownedKey.current = null;
      closeRef.current();
    }
  }, [location, flag, navigate, closeRef]);
};
