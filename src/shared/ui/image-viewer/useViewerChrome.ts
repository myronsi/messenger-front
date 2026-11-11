import { useCallback, useEffect, useRef, useState } from 'react';

export const CHROME_TAP_DELAY_MS = 300;

export const useViewerChrome = () => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(0);

  const cancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);

  const toggleNow = useCallback(() => {
    cancel();
    setVisible((current) => !current);
  }, [cancel]);

  const toggleSoon = useCallback(() => {
    if (timerRef.current) {
      cancel();
      return;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0;
      setVisible((current) => !current);
    }, CHROME_TAP_DELAY_MS);
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { visible, toggleNow, toggleSoon, cancel };
};
