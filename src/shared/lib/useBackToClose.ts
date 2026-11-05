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
  const pushed = useRef(false);
  const closeRef = useLatestRef(close);

  useEffect(() => {
    const current = locationRef.current;
    if (active && !pushed.current && isMobileComposer()) {
      pushed.current = true;
      const { pathname, search, hash } = current;
      navigate({ pathname, search, hash }, { state: { ...stateOf(current.state), [flag]: true } });
    } else if (!active && pushed.current) {
      pushed.current = false;
      if (stateOf(current.state)[flag]) navigate(-1);
    }
  }, [active, flag, navigate, locationRef]);

  useEffect(() => {
    if (pushed.current && !stateOf(location.state)[flag]) {
      pushed.current = false;
      closeRef.current();
    }
  }, [location, flag, closeRef]);
};
