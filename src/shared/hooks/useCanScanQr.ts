import { useEffect, useState } from 'react';

const TOUCH_QUERY = '(pointer: coarse)';

const matchesTouch = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(TOUCH_QUERY).matches;

export const useCanScanQr = () => {
  const [canScan, setCanScan] = useState(matchesTouch);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(TOUCH_QUERY);
    const update = () => setCanScan(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return canScan;
};
