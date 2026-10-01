import { Dispatch, SetStateAction, useEffect } from 'react';
import type { Message } from '@/entities/message';

const LOCAL_DELETE_EVENT = 'messenger:message-deleted-local';
const FULL_ANIMATION_MS = 750;
const REDUCED_ANIMATION_MS = 250;

interface LocalDeleteDetail {
  chatId: number;
  messageId: number;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The animation is purely visual: the message is always removed from state after a timeout.
export const removeMessageAnimated = (setMessages: Dispatch<SetStateAction<Message[]>>, messageId: number) => {
  setMessages((prev) => prev.map((message) => (
    message.id === messageId && !message.is_deleting ? { ...message, is_deleting: true } : message
  )));
  window.setTimeout(() => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  }, prefersReducedMotion() ? REDUCED_ANIMATION_MS : FULL_ANIMATION_MS);
};

export const notifyMessageDeletedLocally = (chatId: number, messageId: number) => {
  window.dispatchEvent(new CustomEvent<LocalDeleteDetail>(LOCAL_DELETE_EVENT, { detail: { chatId, messageId } }));
};

export const useLocalMessageDeletion = (chatId: number, setMessages: Dispatch<SetStateAction<Message[]>>) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const { chatId: eventChatId, messageId } = (event as CustomEvent<LocalDeleteDetail>).detail;
      if (eventChatId === chatId) removeMessageAnimated(setMessages, messageId);
    };
    window.addEventListener(LOCAL_DELETE_EVENT, handler);
    return () => window.removeEventListener(LOCAL_DELETE_EVENT, handler);
  }, [chatId, setMessages]);
};
