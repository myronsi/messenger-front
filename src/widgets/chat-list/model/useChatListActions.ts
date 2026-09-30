import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat } from '@/entities/message';
import type { ChatContextMenuState, ChatListModal, ChatOverrideMap, ChatsListComponentProps } from './types';

interface UseChatListActionsParams {
  username: string;
  activeChatId?: number;
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  createChat: (args: { user1: string; user2: string }) => { unwrap: () => Promise<unknown> };
  setChatPinned: (args: { chatId: number; pinned: boolean }) => { unwrap: () => Promise<unknown> };
  markChatRead: (args: { chatId: number; markAll: boolean }) => {
    unwrap: () => Promise<{ unread_count: number; first_unread_message_id: number | null }>;
  };
  refetch: () => void;
  chatsByIdRef: React.MutableRefObject<Record<number, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setChatContextMenu: Dispatch<SetStateAction<ChatContextMenuState | null>>;
  setModal: (modal: ChatListModal | null) => void;
  translations: any;
}

// Chat list user actions: creating chats, opening a chat, the row context
// menu, pinning, and marking a chat read (each with optimistic updates).
export function useChatListActions(params: UseChatListActionsParams) {
  const {
    username, activeChatId, onChatOpen, createChat, setChatPinned, markChatRead, refetch,
    chatsByIdRef, setChatOverrides, setChatContextMenu, setModal, translations,
  } = params;

  const [targetUser, setTargetUser] = useState('');

  const handleCreateChat = async () => {
    if (!targetUser.trim()) {
      setModal({
        type: 'validation',
        message: translations.enterUsername || 'Please enter a username',
      });
      return;
    }

    try {
      await createChat({
        user1: username,
        user2: targetUser.trim(),
      }).unwrap();

      setTargetUser('');
      setModal({
        type: 'success',
        message: translations.chatCreated || 'Chat created successfully',
      });

      // The refetch will be triggered by WebSocket, but you can also manually refetch
      refetch();
    } catch (error: any) {
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || 'Failed to create chat',
      });
    }
  };

  // Create chat directly with a selected username (used by suggestion click)
  const handleCreateChatWith = async (usernameTo: string) => {
    try {
      await createChat({ user1: username, user2: usernameTo }).unwrap();
      setTargetUser('');
      setModal({ type: 'success', message: translations.chatCreated || 'Chat created successfully' });
      refetch();
    } catch (error: any) {
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to create chat' });
    }
  };

  const handleChatClick = (chat: Chat) => {
    // Don't re-open if this chat is already active
    if (chat.id === activeChatId) {
      return;
    }
    onChatOpen(
      chat.id,
      chat.name,
      chat.interlocutor_deleted,
      chat.type,
      chat.display_name,
      chat.is_online,
      chat.last_seen,
      chat.first_unread_message_id,
      chat.avatar_url,
      chat.pending_approval_request,
      typeof chat.last_message?.content === 'string' ? chat.last_message.content : undefined,
    );
  };

  const handleChatContextMenu = (event: React.MouseEvent, chat: Chat) => {
    event.preventDefault();
    event.stopPropagation();
    if (chat.pending_approval_request) return;
    setChatContextMenu({
      x: event.clientX,
      y: event.clientY,
      chatId: chat.id,
      isPinned: !!chat.is_pinned,
      unreadCount: chat.unread_count || 0,
    });
  };

  const handleTogglePinnedChat = async (chatId: number) => {
    const chat = chatsByIdRef.current[chatId];
    const nextPinned = !chat?.is_pinned;
    setChatContextMenu(null);
    setChatOverrides((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        is_pinned: nextPinned,
      },
    }));

    try {
      await setChatPinned({ chatId, pinned: nextPinned }).unwrap();
      refetch();
    } catch (error: any) {
      setChatOverrides((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          is_pinned: !!chat?.is_pinned,
        },
      }));
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || 'Failed to update pinned chat',
      });
    }
  };

  const handleMarkChatRead = async (chatId: number) => {
    const chat = chatsByIdRef.current[chatId];
    const previousUnreadCount = chat?.unread_count ?? 0;
    const previousFirstUnreadId = chat?.first_unread_message_id ?? null;
    setChatContextMenu(null);
    setChatOverrides((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        unread_count: 0,
        first_unread_message_id: null,
      },
    }));

    try {
      const result = await markChatRead({ chatId, markAll: true }).unwrap();
      setChatOverrides((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          unread_count: result.unread_count,
          first_unread_message_id: result.first_unread_message_id,
        },
      }));
      refetch();
    } catch (error: any) {
      setChatOverrides((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          unread_count: previousUnreadCount,
          first_unread_message_id: previousFirstUnreadId,
        },
      }));
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || translations.errorLoading || 'Failed to mark chat as read',
      });
    }
  };

  return {
    targetUser,
    setTargetUser,
    handleCreateChat,
    handleCreateChatWith,
    handleChatClick,
    handleChatContextMenu,
    handleTogglePinnedChat,
    handleMarkChatRead,
  };
}
