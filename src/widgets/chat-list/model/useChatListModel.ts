import { useEffect, useState } from 'react';
import { clearAuthTokens, useAccessToken } from '@/shared/auth/session';
import { useChatsData } from './useChatsData';
import { useChatFormatters } from './useChatFormatters';
import { useChatSearchOverlay } from './useChatSearchOverlay';
import { useChatListWebSocket } from './useChatListWebSocket';
import { useChatListActions } from './useChatListActions';
import type { ChatContextMenuState, ChatListModal, ChatsListComponentProps } from './types';

// Top-level model hook for the chat list widget: composes data fetching,
// the WebSocket live-update connection, user-action handlers, and the
// search-overlay animation into a single object consumed by the view.
export function useChatListModel(props: ChatsListComponentProps) {
  const { username, onChatOpen, activeChatId, activeChatName, onActiveChatUpdate, onChatDeleted } = props;

  const [modal, setModal] = useState<ChatListModal | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<ChatContextMenuState | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const token = useAccessToken();

  const {
    chats, isLoading, error, refetch, requestInbox, refetchRequestInbox, currentUserData,
    createChat, setChatPinned, markChatRead, oneOnOneChatsData, chatsByIdRef,
    setChatOverrides, setPresenceByUsername,
  } = useChatsData(username);

  const { translations, language, getLastMessagePreview, getLastMessageTime, isOwnLastMessage, isOwnLastMessageRead } =
    useChatFormatters(currentUserData?.id);

  const searchOverlay = useChatSearchOverlay();

  const actions = useChatListActions({
    username,
    activeChatId,
    onChatOpen,
    createChat,
    setChatPinned,
    markChatRead,
    refetch,
    chatsByIdRef,
    setChatOverrides,
    setChatContextMenu,
    setModal,
    translations,
  });

  useChatListWebSocket({
    token,
    username,
    activeChatId,
    activeChatName,
    onChatOpen,
    onChatDeleted,
    currentUserId: currentUserData?.id,
    refetch,
    refetchRequestInbox,
    chatsByIdRef,
    setChatOverrides,
    setPresenceByUsername,
    setModal,
  });

  useEffect(() => {
    if (!activeChatId || !onActiveChatUpdate) return;
    const activeChat = chats.find((chat) => chat.id === activeChatId);
    if (activeChat) onActiveChatUpdate(activeChat);
  }, [activeChatId, chats, onActiveChatUpdate]);

  // Handle RTK Query errors
  useEffect(() => {
    if (!error) return;
    let errorMessage = 'Failed to load chats';

    if ('data' in error && error.data) {
      errorMessage = (error.data as any).detail || 'Failed to load chats';
    } else if ('message' in error && error.message) {
      errorMessage = error.message;
    }

    setModal({
      type: 'error',
      message: errorMessage.includes('401') ? translations.loginRequired : translations.errorLoading,
      onConfirm: errorMessage.includes('401') ? () => {
        clearAuthTokens();
        window.location.href = '/';
      } : undefined,
    });
  }, [error, translations]);

  useEffect(() => {
    if (!chatContextMenu) return;

    const closeMenu = () => setChatContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatContextMenu]);

  return {
    username,
    onChatOpen,
    translations,
    language,
    modal,
    setModal,
    chatContextMenu,
    selectedUser,
    setSelectedUser,
    isLoading,
    chats,
    requestInbox,
    oneOnOneChatsData,
    refetch,
    getLastMessagePreview,
    getLastMessageTime,
    isOwnLastMessage,
    isOwnLastMessageRead,
    ...searchOverlay,
    ...actions,
  };
}
