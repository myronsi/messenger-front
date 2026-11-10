import type { EntityId } from '@/shared/api/entityId';
import { MutableRefObject } from 'react';
import { Message } from '@/entities/message';
import { messageMenuPlacement } from '@/features/message-actions';
import { DELETED_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

interface ChatMenuPosition {
  x: number;
  y: number;
  messageId: EntityId;
  isMine: boolean;
  openLeft?: boolean;
}

interface ChatReactionMenu {
  message: Message;
  x: number;
  y: number;
  isClosing?: boolean;
}

interface ChatInteractionsOptions {
  chatName: string;
  username: string;
  userId: EntityId | null;
  interlocutorDeleted: boolean;
  interlocutorAvatarUrl?: string;
  messages: Message[];
  contextMenu: ChatMenuPosition | null;
  setContextMenu: (menu: ChatMenuPosition | null) => void;
  reactionMenu: ChatReactionMenu | null;
  setReactionMenu: (menu: ChatReactionMenu | null) => void;
  setIsClosing: (isClosing: boolean) => void;
  closeMenus: () => void;
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onOpenUserProfile?: (username: string) => void;
  setIsUserProfileOpen: (open: boolean) => void;
  scrollToMessage: (messageId: EntityId) => void;
  setTempHighlightedMessageId: (messageId: EntityId | null) => void;
}

export const useChatInteractions = ({
  chatName,
  username,
  userId,
  interlocutorDeleted,
  interlocutorAvatarUrl,
  messages,
  contextMenu,
  setContextMenu,
  reactionMenu,
  setReactionMenu,
  setIsClosing,
  closeMenus,
  messageRefs,
  onOpenUserProfile,
  setIsUserProfileOpen,
  scrollToMessage,
  setTempHighlightedMessageId,
}: ChatInteractionsOptions) => {
  const isOwnMessage = (message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  };

  const normalizeAvatarUrl = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

  const openMenusAt = (message: Message, point: { clientX: number; clientY: number }) => {
    if (!messageRefs.current[message.id]) return;
    const placement = messageMenuPlacement(point, messageRefs.current[message.id]);
    setReactionMenu({ message, ...placement.reaction });
    setContextMenu({ ...placement.context, openLeft: placement.openLeft, messageId: message.id, isMine: isOwnMessage(message) });
  };

  const closeThen = (next?: () => void) => {
    setIsClosing(true);
    setTimeout(() => {
      closeMenus();
      setIsClosing(false);
      next?.();
    }, 200);
  };

  const handleMessageClick = (event: React.MouseEvent, message: Message) => {
    if (window.innerWidth >= 768 && event.type !== 'contextmenu') return;
    event.preventDefault();
    event.stopPropagation();
    if (interlocutorDeleted) return;
    const point = { clientX: event.clientX, clientY: event.clientY };
    if (contextMenu || reactionMenu) {
      const sameMessage = contextMenu?.messageId === message.id;
      closeThen(event.type === 'contextmenu' && !sameMessage ? () => openMenusAt(message, point) : undefined);
      return;
    }
    openMenusAt(message, point);
  };

  const onOpenReactionMenu = (message: Message, event: React.MouseEvent) => {
    const point = { clientX: event.clientX, clientY: event.clientY };
    if (contextMenu || reactionMenu) {
      const sameMessage = contextMenu?.messageId === message.id;
      closeThen(sameMessage ? undefined : () => openMenusAt(message, point));
      return;
    }
    openMenusAt(message, point);
  };

  const onOpenProfile = () => {
    if (onOpenUserProfile) onOpenUserProfile(chatName);
    else setIsUserProfileOpen(true);
  };

  const interlocutorAvatar = interlocutorDeleted
    ? DELETED_AVATAR
    : normalizeAvatarUrl(interlocutorAvatarUrl || messages.find((message) => !isOwnMessage(message))?.avatar_url);

  const jumpToSearchResult = (messageId: EntityId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTempHighlightedMessageId(messageId);
      setTimeout(() => setTempHighlightedMessageId(null), 2000);
    } else {
      scrollToMessage(messageId);
    }
  };

  const onScrollStart = () => {
    if (contextMenu || reactionMenu) closeMenus();
  };

  return { isOwnMessage, handleMessageClick, onOpenReactionMenu, onOpenProfile, interlocutorAvatar, jumpToSearchResult, onScrollStart };
};
