import { useCallback, useEffect, useRef } from 'react';
import { preloadMedia } from './mediaCache';

export const useMediaPreload = (url?: string | null) => {
  const cancel = useRef<() => void>(undefined);
  useEffect(() => () => { cancel.current?.(); cancel.current = undefined; }, [url]);
  const onPointerEnter = useCallback(() => { cancel.current = preloadMedia(url); }, [url]);
  const onPointerLeave = useCallback(() => { cancel.current?.(); cancel.current = undefined; }, []);
  return { onPointerEnter, onPointerLeave };
};
