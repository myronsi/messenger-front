import { useCallback, useEffect, useRef, useState } from 'react';

export const useElementHeight = <T extends HTMLElement>() => {
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [node, setNode] = useState<T | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    setNode(element);
    if (!element) {
      setHeight(undefined);
      return;
    }
    const measure = () => setHeight(Math.round(element.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(element);
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, height, node] as const;
};
