import { useMemo, useSyncExternalStore } from 'react';
import type { Call } from '../api/callsApi';
import { useStore } from '../model/createStore';
import { callPeople, type LayoutInput } from '../model/videoLayout';
import { videoStore } from '../model/videoStore';

export const useLayoutInput = (call: Call | null, userId: string | null, sessionId: string | null): LayoutInput => {
  const video = useStore(videoStore);
  const people = useMemo(() => callPeople(call, userId, sessionId), [call, userId, sessionId]);
  return useMemo(() => ({ ...video, people }), [video, people]);
};

const NARROW_QUERY = '(max-width: 639px)';

const narrowQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(NARROW_QUERY) : null);

const subscribeNarrow = (listener: () => void) => {
  const query = narrowQuery();
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
};

const readNarrow = () => !!narrowQuery()?.matches;

export const useNarrowScreen = () => useSyncExternalStore(subscribeNarrow, readNarrow, readNarrow);
