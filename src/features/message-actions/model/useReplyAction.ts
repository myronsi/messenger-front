import { useCallback, type RefObject } from 'react';
import type { Message } from '@/entities/message';

interface ReplyTargets {
  setReplyTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (value: string) => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useReplyAction = ({ setReplyTo, setEditingMessage, setMessageInput, messageInputRef }: ReplyTargets) =>
  useCallback((message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
    setMessageInput('');
    messageInputRef.current?.focus();
  }, [messageInputRef, setEditingMessage, setMessageInput, setReplyTo]);
