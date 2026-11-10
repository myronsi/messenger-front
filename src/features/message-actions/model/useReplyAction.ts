import { useCallback, type RefObject } from 'react';
import type { Message } from '@/entities/message';
import { focusComposer } from '@/shared/lib/composerFocus';

interface ReplyTargets {
  editingMessage: Message | null;
  setReplyTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (value: string) => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useReplyAction = ({ editingMessage, setReplyTo, setEditingMessage, setMessageInput, messageInputRef }: ReplyTargets) =>
  useCallback((message: Message) => {
    setReplyTo(message);
    if (editingMessage) {
      setEditingMessage(null);
      setMessageInput('');
    }
    focusComposer(messageInputRef.current);
  }, [editingMessage, messageInputRef, setEditingMessage, setMessageInput, setReplyTo]);
