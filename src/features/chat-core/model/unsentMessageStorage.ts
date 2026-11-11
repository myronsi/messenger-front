import { useEffect, useRef, useState } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { readUnsentMessages, unsentMessagesId, writeUnsentMessages } from '@/shared/lib/unsentMessages';
import { sortMessages, type Message } from '@/entities/message';
import { useLatest } from './useLatest';
import type { SetMessages } from './types';

export const RESEND_WINDOW_MS = 23 * 60 * 60 * 1000;

const tempKey = (message: Message) => String(message.client_temp_id ?? message.id);

export const isKeptUnsent = (message: Message) => (
  !isPersistedId(message.id) && Boolean(message.is_own) && !message.is_deleting && message.type === 'message' && typeof message.content === 'string'
);

export const restoreUnsentMessages = (current: Message[], saved: Message[], now: number, notConfirmed: string) => {
  const known = new Set(current.map(tempKey));
  const added = saved.filter((message) => isKeptUnsent(message) && !known.has(tempKey(message)));
  const pending: Message[] = [];
  let changed = added.length > 0;
  const merged = [...current, ...added].map((message) => {
    if (!isKeptUnsent(message) || message.delivery_error) return message;
    if (now - Date.parse(message.timestamp) < RESEND_WINDOW_MS) {
      pending.push(message);
      return message;
    }
    changed = true;
    return { ...message, delivery_error: notConfirmed };
  });
  return { messages: changed ? sortMessages(merged) : current, pending };
};

interface UnsentMessageStorageOptions {
  chatId: EntityId;
  messages: Message[];
  setMessages: SetMessages;
  resend: (message: Message) => void;
  notConfirmed: string;
}

export const useUnsentMessageStorage = ({ chatId, messages, setMessages, resend, notConfirmed }: UnsentMessageStorageOptions) => {
  const id = unsentMessagesId(getTokenSubject(useAccessToken()), chatId);
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);
  const latest = useLatest({ messages, resend, notConfirmed });

  useEffect(() => {
    if (!id || handledRef.current === id) return;
    handledRef.current = id;
    const saved = readUnsentMessages<Message>(id);
    const now = Date.now();
    const { pending } = restoreUnsentMessages(latest.current.messages, saved, now, latest.current.notConfirmed);
    setMessages((previous) => restoreUnsentMessages(previous, saved, now, latest.current.notConfirmed).messages);
    pending.forEach((message) => latest.current.resend(message));
    setRestoredId(id);
  }, [id, latest, setMessages]);

  useEffect(() => {
    if (id && restoredId === id) writeUnsentMessages(id, messages.filter(isKeptUnsent));
  }, [id, restoredId, messages]);
};
