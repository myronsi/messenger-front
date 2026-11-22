import type React from 'react';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { SocketSender } from '@/shared/api/realtime';
import { readDoubleTapReaction, toggleReaction, type Message } from '@/entities/message';
import { useStableCallback } from '@/shared/lib/useStableCallback';
import { isIgnoredTap } from './tapFilter';

export const DOUBLE_TAP_MS = 280;
export const MENU_CLOSE_GRACE_MS = 400;
const TOUCH_LAYOUT_PX = 768;

interface MessageTapOptions {
  onMessageClick: (event: React.MouseEvent, message: Message) => void;
  userId: EntityId;
  wsRef: MutableRefObject<SocketSender | null>;
  lastScrollAtRef: MutableRefObject<number>;
  canReact: boolean;
  menuOpen: boolean;
}

const reactable = (message: Message) => isPersistedId(message.id) && !message.is_deleted && !message.is_deleting;

export const useMessageTap = ({ onMessageClick, userId, wsRef, lastScrollAtRef, canReact, menuOpen }: MessageTapOptions) => {
  const pending = useRef<{ id: EntityId; timer: number } | null>(null);
  const menuClosedAt = useRef(Number.NEGATIVE_INFINITY);
  const menuWasOpen = useRef(menuOpen);

  useEffect(() => {
    if (menuWasOpen.current && !menuOpen) menuClosedAt.current = performance.now();
    menuWasOpen.current = menuOpen;
  }, [menuOpen]);

  const clearPending = () => {
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
  };

  useEffect(() => clearPending, []);

  const react = (event: React.MouseEvent, message: Message, reaction: string) => {
    toggleReaction(wsRef.current, message, userId, reaction, { x: event.clientX, y: event.clientY });
    navigator.vibrate?.(8);
  };

  return useStableCallback((event: React.MouseEvent, message: Message) => {
    event.preventDefault();
    const touchLayout = window.innerWidth < TOUCH_LAYOUT_PX;
    const reaction = readDoubleTapReaction(userId);
    const menuActive = menuOpen || performance.now() - menuClosedAt.current < MENU_CLOSE_GRACE_MS;
    const doubleTapAllowed = !!reaction && canReact && !menuActive && reactable(message);
    if (event.type === 'dblclick') {
      if (touchLayout || !doubleTapAllowed) return;
      window.getSelection()?.removeAllRanges();
      if (!isIgnoredTap(event, lastScrollAtRef.current)) react(event, message, reaction);
      return;
    }
    if (isIgnoredTap(event, lastScrollAtRef.current)) return;
    if (!touchLayout || !doubleTapAllowed) {
      onMessageClick(event, message);
      return;
    }
    const previous = pending.current;
    clearPending();
    if (previous?.id === message.id) {
      react(event, message, reaction);
      return;
    }
    pending.current = {
      id: message.id,
      timer: window.setTimeout(() => {
        pending.current = null;
        onMessageClick(event, message);
      }, DOUBLE_TAP_MS),
    };
  });
};
