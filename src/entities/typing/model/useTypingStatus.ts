import { useEffect, useRef, useState } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { realtime } from '@/shared/api/realtime';
import type { TypingAction } from './typingStore';

export const TYPING_REPEAT_MS = 3000;
export const TYPING_IDLE_MS = 5000;

export const sendTyping = (chatId: EntityId, isTyping: boolean, action: TypingAction) =>
  realtime.sendIfOpen({ type: 'typing', chat_id: String(chatId), data: { is_typing: isTyping, action } });

interface TypingStatusOptions {
  chatId: EntityId;
  text: string;
  canType: boolean;
  isRecording: boolean;
}

export const useTypingStatus = ({ chatId, text, canType, isRecording }: TypingStatusOptions) => {
  const [typingIn, setTypingIn] = useState<EntityId | null>(null);
  const seen = useRef({ chatId, text });
  useEffect(() => {
    const previous = seen.current;
    seen.current = { chatId, text };
    if (!canType || !text.trim() || previous.chatId !== chatId) setTypingIn(null);
    else if (previous.text !== text) setTypingIn(chatId);
  }, [chatId, text, canType]);
  const isTyping = typingIn !== null && typingIn === chatId;
  useEffect(() => {
    if (!isTyping) return;
    const timer = setTimeout(() => setTypingIn(null), TYPING_IDLE_MS);
    return () => clearTimeout(timer);
  }, [isTyping, text]);
  const action: TypingAction | null = isRecording ? 'recording_voice' : isTyping ? 'typing' : null;
  useEffect(() => {
    if (!action || !isPersistedId(chatId)) return;
    sendTyping(chatId, true, action);
    const timer = setInterval(() => sendTyping(chatId, true, action), TYPING_REPEAT_MS);
    return () => {
      clearInterval(timer);
      sendTyping(chatId, false, action);
    };
  }, [chatId, action]);
};
