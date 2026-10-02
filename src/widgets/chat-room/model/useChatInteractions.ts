import { MutableRefObject } from 'react';
import { Message } from '@/entities/message';
import { DELETED_AVATAR } from '@/shared/base/ui';
import { mediaUrl } from '@/shared/utils/mediaUrl';

interface ChatMenuPosition {
  x: number;
  y: number;
  messageId: number;
  isMine: boolean;
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
  userId: number | null;
  interlocutorDeleted: boolean;
  interlocutorAvatarUrl?: string;
  messages: Message[];
  contextMenu: ChatMenuPosition | null;
  setContextMenu: (menu: ChatMenuPosition | null) => void;
  reactionMenu: ChatReactionMenu | null;
  setReactionMenu: (menu: ChatReactionMenu | null) => void;
  setIsClosing: (isClosing: boolean) => void;
  closeMenus: () => void;
  messageRefs: MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onOpenUserProfile?: (username: string) => void;
  setIsUserProfileOpen: (open: boolean) => void;
  scrollToMessage: (messageId: number) => void;
  setTempHighlightedMessageId: (messageId: number | null) => void;
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

  const normalizeAvatarUrl = (avatarUrl?: string | null) => mediaUrl(avatarUrl);

  const handleMessageClick = (event: React.MouseEvent, message: Message) => {
    if (window.innerWidth >= 768 && event.type !== 'contextmenu') return;
    event.preventDefault();
    if (interlocutorDeleted) return;
    if (contextMenu?.messageId === message.id && reactionMenu?.message.id === message.id) {
      setIsClosing(true);
      setTimeout(() => {
        closeMenus();
        setIsClosing(false);
      }, 200);
    } else if (contextMenu || reactionMenu) {
      setIsClosing(true);
      setTimeout(() => {
        closeMenus();
        setIsClosing(false);
        if (!messageRefs.current[message.id]) return;
        setReactionMenu({ message, x: event.clientX, y: event.clientY - 45 });
        setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
      }, 200);
    } else if (messageRefs.current[message.id]) {
      setReactionMenu({ message, x: event.clientX, y: event.clientY - 45 });
      setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
    }
    event.stopPropagation();
  };

  const onOpenReactionMenu = (message: Message, event: React.MouseEvent) => {
    if (reactionMenu?.message.id === message.id && contextMenu?.messageId === message.id) {
      setIsClosing(true);
      setTimeout(() => closeMenus(), 200);
    } else if (contextMenu || reactionMenu) {
      setIsClosing(true);
      setTimeout(() => {
        closeMenus();
        if (!messageRefs.current[message.id]) return;
        setReactionMenu({ message, x: event.clientX, y: event.clientY - 35 });
        setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
      }, 200);
    } else if (messageRefs.current[message.id]) {
      setReactionMenu({ message, x: event.clientX, y: event.clientY - 35 });
      setContextMenu({ x: event.clientX, y: event.clientY, messageId: message.id, isMine: isOwnMessage(message) });
    }
  };

  const onOpenProfile = () => {
    if (onOpenUserProfile) onOpenUserProfile(chatName);
    else setIsUserProfileOpen(true);
  };

  const interlocutorAvatar = interlocutorDeleted
    ? DELETED_AVATAR
    : normalizeAvatarUrl(interlocutorAvatarUrl || messages.find((message) => !isOwnMessage(message))?.avatar_url);

  const jumpToSearchResult = (messageId: number) => {
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
