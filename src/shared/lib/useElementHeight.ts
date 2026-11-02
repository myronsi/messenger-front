import { useCallback, useEffect, useRef, useState } from 'react';

export const useElementHeight = <T extends HTMLElement>() => {
  const [height, setHeight] = useState<number | undefined>(undefined);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) {
      setHeight(undefined);
      return;
    }
    const measure = () => setHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(node);
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, height] as const;
};
