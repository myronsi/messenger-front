import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';

type ContextMenuState = { x: number; y: number; messageId: Id; isMine: boolean; isClosing?: boolean };
type ReactionMenuState = { message: Message; x: number; y: number; isClosing?: boolean };

interface UseGroupMessageMenusArgs {
  isOwnMessage: (message: Message) => boolean;
  messageJumpRequest?: { messageId: Id; key: number } | null;
}

// Context/reaction menus plus message highlighting and "jump to message" behaviour of the group chat view.
export const useGroupMessageMenus = ({ isOwnMessage, messageJumpRequest }: UseGroupMessageMenusArgs) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [reactionMenu, setReactionMenu] = useState<ReactionMenuState | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<Id | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<Id | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  }, []);

  const openMenus = useCallback((message: Message, event: React.MouseEvent) => {
    setReactionMenu({ message, x: event.clientX, y: event.clientY - 45 });
    setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
  }, [isOwnMessage]);

  const handleMessageClick = useCallback((event: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || event.type === 'contextmenu') {
      event.preventDefault();
      event.stopPropagation();
      if (contextMenu?.messageId === message.id && reactionMenu?.message.id === message.id) {
        setIsClosing(true);
        setTimeout(closeMenus, 200);
        return;
      }
      if (contextMenu || reactionMenu) {
        setIsClosing(true);
        setTimeout(() => {
          closeMenus();
          openMenus(message, event);
        }, 200);
        return;
      }
      openMenus(message, event);
    }
  }, [closeMenus, contextMenu, openMenus, reactionMenu]);

  const scrollToMessage = useCallback((messageId: Id) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
  }, []);

  const jumpToSearchResult = useCallback((messageId: Id) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTempHighlightedMessageId(messageId);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
      return;
    }
    scrollToMessage(messageId);
  }, [scrollToMessage]);

  const messageJumpRequestRef = useRef(messageJumpRequest);
  messageJumpRequestRef.current = messageJumpRequest;

  useEffect(() => {
    const request = messageJumpRequestRef.current;
    if (!request) return;
    jumpToSearchResult(request.messageId);
  }, [jumpToSearchResult, messageJumpRequest?.key]);

  return {
    contextMenu, setContextMenu, reactionMenu, setReactionMenu, isClosing,
    highlightedMessageId, setHighlightedMessageId, tempHighlightedMessageId, setTempHighlightedMessageId,
    messageRefs, contextMenuRef, reactionMenuRef,
    closeMenus, openMenus, handleMessageClick, scrollToMessage, jumpToSearchResult,
  };
};