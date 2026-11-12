import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { isGoApi } from '@/shared/api/goSocket';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { fetchServerUnsent, sortMessages, type KeptSend, type Message } from '@/entities/message';
import { createOptimisticMessage } from './optimisticMessage';
import type { SetMessages } from './types';

export const keptErrorText = (code: string, translations: Translations) => {
  if (code === 'blocked_by_user') return translations.messageNotDeliveredBlocked;
  if (code === 'forbidden') return translations.messageNotDeliveredPrivacy;
  if (code === 'rate_limited') return translations.messageRateLimited;
  return translations.messageDeliveryNotConfirmed;
};

export const markServerKept = (messages: Message[], messageId: EntityId) => messages.map((message) => (
  String(message.id) === String(messageId) && !message.server_kept ? { ...message, server_kept: true } : message
));

export const mergeServerUnsent = (current: Message[], kept: KeptSend[], toMessage: (send: KeptSend) => Message): Message[] => {
  const waiting = new Map(kept.map((send) => [String(send.tempId), send]));
  let changed = false;
  const next = current.map((message) => {
    const key = String(message.client_temp_id ?? message.id);
    if (!waiting.has(key)) return message;
    waiting.delete(key);
    if (isPersistedId(message.id) || message.server_kept) return message;
    changed = true;
    return { ...message, server_kept: true };
  });
  if (!waiting.size) return changed ? next : current;
  return sortMessages([...next, ...[...waiting.values()].map(toMessage)]);
};

interface ServerOutboxOptions {
  chatId: EntityId;
  setMessages: SetMessages;
  username: string;
  senderId: EntityId;
  translationsRef: MutableRefObject<Translations>;
}

export const useServerOutbox = ({ chatId, setMessages, username, senderId, translationsRef }: ServerOutboxOptions) => {
  useEffect(() => {
    if (!isGoApi() || !isPersistedId(chatId)) return;
    let active = true;
    fetchServerUnsent(chatId).then((kept) => {
      if (!active || !kept.length) return;
      setMessages((previous) => mergeServerUnsent(previous, kept, (send) => createOptimisticMessage(send.tempId, username, senderId || undefined, {
        ...send.fields, delivery_error: keptErrorText(send.code, translationsRef.current), server_kept: true,
      })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [chatId, setMessages, username, senderId, translationsRef]);
};
