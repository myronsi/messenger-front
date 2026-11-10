import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { getAccessToken, useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { draftId, readDraft, writeDraft } from '@/shared/lib/drafts';

export const DRAFT_WRITE_DELAY_MS = 300;

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
  const pendingRef = useRef<{ id: string | null; key: string | null; value: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelWrite = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
  }, []);

  const flushWrite = useCallback(() => {
    const pending = pendingRef.current;
    cancelWrite();
    if (pending && draftId(getTokenSubject(getAccessToken()), pending.key) === pending.id) writeDraft(pending.id, pending.value);
  }, [cancelWrite]);

  useEffect(() => {
    if (!persist) {
      flushWrite();
      return;
    }
    if (!value.trim()) {
      cancelWrite();
      writeDraft(id, value);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = { id, key, value };
    timerRef.current = setTimeout(flushWrite, DRAFT_WRITE_DELAY_MS);
  }, [id, key, persist, value, flushWrite, cancelWrite]);

  useEffect(() => flushWrite, [id, flushWrite]);

  const setValue = useCallback((next: SetStateAction<string>) => {
    const resolved = typeof next === 'function' ? next(valueRef.current) : next;
    valueRef.current = resolved;
    // An empty value is removed right away: the component may unmount (for example after the first message
    // creates the chat) before the effect below runs.
    if (persist && !resolved.trim()) {
      cancelWrite();
      writeDraft(id, resolved);
    }
    setDraft({ id, value: resolved });
  }, [id, persist, cancelWrite]);

  return [value, setValue] as const;
};
