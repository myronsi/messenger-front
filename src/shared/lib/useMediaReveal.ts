import { useEffect, useRef, useState } from 'react';

export const QUICK_LOAD_MS = 150;

export const useMediaReveal = (key?: string | null) => {
  const startedAt = useRef(0);
  const [done, setDone] = useState<{ key?: string | null; pop: boolean }>();
  useEffect(() => { startedAt.current = performance.now(); }, [key]);
  const loaded = !!done && done.key === key;
  return {
    loaded,
    pop: loaded && done.pop,
    onLoad: () => setDone({ key, pop: performance.now() - startedAt.current > QUICK_LOAD_MS }),
  };
};
