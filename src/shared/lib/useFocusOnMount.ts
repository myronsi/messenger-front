import { useCallback } from 'react';

export const useFocusOnMount = <T extends HTMLElement>() => useCallback((node: T | null) => {
  node?.focus();
}, []);
