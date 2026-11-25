import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { isMobileComposer } from './composerFocus';
import { useLatestRef } from './useLatestRef';

type EntryState = Record<string, unknown>;

const stateOf = (state: unknown): EntryState => (state && typeof state === 'object' ? state as EntryState : {});

let openings = 0;
const liveArms = new Set<number>();
let backPending = false;
let backFrom: string | null = null;
let backTimer = 0;
const waiting = new Set<() => void>();
const SETTLE_MS = 400;

const settleBack = () => {
  if (!backPending) return;
  backPending = false;
  backFrom = null;
  window.clearTimeout(backTimer);
  const queued = [...waiting];
  waiting.clear();
  queued.forEach((resume) => resume());
};

const goBack = (navigate: NavigateFunction, fromKey: string) => {
  backPending = true;
  backFrom = fromKey;
  window.clearTimeout(backTimer);
  backTimer = window.setTimeout(settleBack, SETTLE_MS);
  window.addEventListener('popstate', settleBack, { once: true });
  void navigate(-1);
};

const browserEntryKey = () => {
  const key = stateOf(window.history.state).key;
  return typeof key === 'string' ? key : undefined;
};

export const useBackToClose = (active: boolean, close: () => void, flag: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useLatestRef(location);
  const closeRef = useLatestRef(close);
  const navigateRef = useLatestRef(navigate);
  const token = useRef<string | null>(null);
  const ownedKey = useRef<string | null>(null);
  const staleKey = useRef<string | null>(null);
  const armedAt = useRef(0);
  const stateKey = useRef(flag);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const current = locationRef.current;
    if (active && !token.current && isMobileComposer()) {
      if (backPending) {
        const resume = () => setRetry((count) => count + 1);
        waiting.add(resume);
        return () => { waiting.delete(resume); };
      }
      openings += 1;
      armedAt.current = openings;
      liveArms.add(openings);
      token.current = `${flag}-${openings}`;
      const state = stateOf(current.state);
      stateKey.current = flag in state ? token.current : flag;
      const { pathname, search, hash } = current;
      navigate({ pathname, search, hash }, { state: { ...state, [stateKey.current]: token.current } });
    } else if (!active && token.current) {
      liveArms.delete(armedAt.current);
      const owned = ownedKey.current;
      token.current = null;
      ownedKey.current = null;
      if (owned && current.key === owned) goBack(navigate, owned);
      else if (owned) staleKey.current = owned;
    }
    return undefined;
  }, [active, flag, navigate, locationRef, retry]);

  useEffect(() => () => {
    liveArms.delete(armedAt.current);
    if (!token.current || !ownedKey.current || locationRef.current.key !== ownedKey.current) return;
    const entry = browserEntryKey();
    if (entry !== undefined && entry !== ownedKey.current) return;
    token.current = null;
    ownedKey.current = null;
    if ([...liveArms].some((id) => id > armedAt.current)) return;
    goBack(navigateRef.current, locationRef.current.key);
  }, [locationRef, navigateRef]);

  useEffect(() => {
    if (backPending && location.key !== backFrom) settleBack();
    if (staleKey.current && location.key === staleKey.current) {
      staleKey.current = null;
      navigate(-1);
      return;
    }
    if (!token.current) return;
    const mine = stateOf(location.state)[stateKey.current] === token.current;
    if (!ownedKey.current) {
      if (mine) ownedKey.current = location.key;
      return;
    }
    if (!mine) {
      liveArms.delete(armedAt.current);
      token.current = null;
      ownedKey.current = null;
      closeRef.current();
    }
  }, [location, flag, navigate, closeRef]);
};
