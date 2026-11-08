import { useEffect, useState } from 'react';

export const useDelayedUnmount = (open: boolean, delayMs: number) => {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setMounted(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, open]);
  return { mounted: open || mounted, closing: !open && mounted };
};
