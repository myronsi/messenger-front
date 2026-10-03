import { useCallback, useRef } from 'react';

// Returns a function with a stable identity that always calls the latest `fn`,
// so memoized children don't re-render just because a parent recreated its callback.
export const useStableCallback = <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: Args) => ref.current(...args), []);
};
