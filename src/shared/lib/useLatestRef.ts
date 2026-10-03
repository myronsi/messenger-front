import { useLayoutEffect, useRef } from 'react';

// Keeps the newest value in a ref for long-lived listeners; the ref is updated after render, not during it.
export const useLatestRef = <T,>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};
