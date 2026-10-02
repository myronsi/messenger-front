import { useRef } from 'react';

// Keeps the newest value in a ref so long-lived callbacks (sockets, timers) never see stale props.
export const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};