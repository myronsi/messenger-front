import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { draftId, readDraft, writeDraft } from '@/shared/lib/drafts';

// Drop-in replacement for useState('') for a composer: the text is restored after a reload and kept per
// account and conversation. `key` is null for conversations that cannot be persisted. While `persist` is
// false (for example while editing a sent message) the text is not stored, so it cannot come back as a draft.
export const useDraftState = (key: string | null, persist = true) => {
  const account = getTokenSubject(useAccessToken());
  const id = draftId(account, key);
  const [draft, setDraft] = useState(() => ({ id, value: readDraft(id) }));
  if (draft.id !== id) setDraft({ id, value: readDraft(id) });

  const value = draft.id === id ? draft.value : readDraft(id);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (persist) writeDraft(id, value);
  }, [id, persist, value]);

  const setValue = useCallback((next: SetStateAction<string>) => {
    const resolved = typeof next === 'function' ? next(valueRef.current) : next;
    valueRef.current = resolved;
    setDraft({ id, value: resolved });
  }, [id]);

  return [value, setValue] as const;
};