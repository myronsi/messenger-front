import { useEffect, useRef, useState, type UIEvent } from 'react';

export const COLLAPSED_AT = 0.6;

export const useScrollProgress = (distance: number) => {
  const target = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = (event: UIEvent<HTMLElement>) => {
    const top = event.currentTarget.scrollTop;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const progress = Math.min(1, Math.max(0, top / distance));
      target.current?.style.setProperty('--p', progress.toFixed(3));
      setCollapsed(progress > COLLAPSED_AT);
    });
  };

  return { target, onScroll, collapsed };
};
