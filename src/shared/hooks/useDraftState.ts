import { useCallback, useRef, useState, type SetStateAction } from 'react';
import { readDraft, writeDraft } from '@/shared/lib/drafts';

// Drop-in replacement for useState('') for a composer: the text is restored after a reload and kept per chat.
export const useDraftState = (chatId: number) => {
  const [draft, setDraft] = useState(() => ({ chatId, value: readDraft(chatId) }));
  if (draft.chatId !== chatId) setDraft({ chatId, value: readDraft(chatId) });

  const value = draft.chatId === chatId ? draft.value : readDraft(chatId);
  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback((next: SetStateAction<string>) => {
    const resolved = typeof next === 'function' ? next(valueRef.current) : next;
    valueRef.current = resolved;
    writeDraft(chatId, resolved);
    setDraft({ chatId, value: resolved });
  }, [chatId]);

  return [value, setValue] as const;
};