import { useCallback, useRef } from 'react';
import { encodeShortcodes } from '@/shared/lib/customEmoji';
import { useKnownEmoji } from './useKnownEmoji';

export const useShortcodeEncoder = () => {
  const known = useKnownEmoji();
  const knownRef = useRef(known);
  knownRef.current = known;
  return useCallback((text: string) => encodeShortcodes(text, knownRef.current), []);
};
