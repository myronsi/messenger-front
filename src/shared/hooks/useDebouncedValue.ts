import { useEffect, useState } from 'react';

export const useDebouncedValue = <T>(value: T, delayMs: number) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
};
