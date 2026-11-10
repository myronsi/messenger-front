import type { EntityId } from '@/shared/api/entityId';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/entities/message';
import { messageMenuPlacement } from '@/features/message-actions';

type ContextMenuState = { x: number; y: number; messageId: EntityId; isMine: boolean; openLeft?: boolean; isClosing?: boolean };
type ReactionMenuState = { message: Message; x: number; y: number; isClosing?: boolean };

interface UseGroupMessageMenusArgs {
  isOwnMessage: (message: Message) => boolean;
  messageJumpRequest?: { messageId: EntityId; key: number } | null;
}

// Context/reaction menus plus message highlighting and "jump to message" behaviour of the group chat view.
export const useGroupMessageMenus = ({ isOwnMessage, messageJumpRequest }: UseGroupMessageMenusArgs) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [reactionMenu, setReactionMenu] = useState<ReactionMenuState | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<EntityId | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<EntityId | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  }, []);

  const openMenus = useCallback((message: Message, event: { clientX: number; clientY: number }) => {
    const placement = messageMenuPlacement(event, messageRefs.current[message.id]);
    setReactionMenu({ message, ...placement.reaction });
    setContextMenu({ ...placement.context, openLeft: placement.openLeft, messageId: message.id, isMine: isOwnMessage(message) });
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
        const point = { clientX: event.clientX, clientY: event.clientY };
        setIsClosing(true);
        setTimeout(() => {
          closeMenus();
          if (event.type === 'contextmenu') openMenus(message, point);
        }, 200);
        return;
      }
      openMenus(message, event);
    }
  }, [closeMenus, contextMenu, openMenus, reactionMenu]);

  const scrollToMessage = useCallback((messageId: EntityId) => {
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 6000);
  }, []);

  const jumpToSearchResult = useCallback((messageId: EntityId) => {
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
