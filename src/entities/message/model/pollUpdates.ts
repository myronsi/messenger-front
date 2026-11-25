import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Message, MessagePoll } from './types';

const POLL_EVENT = 'messenger:poll-updated';

interface PollUpdateDetail {
  chatId: EntityId;
  messageId: EntityId;
  poll: MessagePoll;
}

export const applyPollUpdate = <T extends { id: EntityId; poll?: MessagePoll }>(items: T[], messageId: EntityId, poll: MessagePoll): T[] => {
  let changed = false;
  const next = items.map((item) => {
    if (String(item.id) !== String(messageId) || !item.poll || item.poll.version >= poll.version) return item;
    changed = true;
    return { ...item, poll };
  });
  return changed ? next : items;
};

export const notifyPollUpdated = (chatId: EntityId, messageId: EntityId, poll: MessagePoll) => {
  window.dispatchEvent(new CustomEvent<PollUpdateDetail>(POLL_EVENT, { detail: { chatId, messageId, poll } }));
};

export const usePollUpdates = (chatId: EntityId, setMessages: Dispatch<SetStateAction<Message[]>>) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const { chatId: eventChatId, messageId, poll } = (event as CustomEvent<PollUpdateDetail>).detail;
      if (String(eventChatId) === String(chatId)) setMessages((previous) => applyPollUpdate(previous, messageId, poll));
    };
    window.addEventListener(POLL_EVENT, handler);
    return () => window.removeEventListener(POLL_EVENT, handler);
  }, [chatId, setMessages]);
};
