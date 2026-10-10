import type { UserRef } from '@/entities/user';
import { asApiError } from '@/shared/lib/apiError';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Chat, MessageSearchHit } from '@/entities/message';
import type { ChatContextMenuState, ChatListModal, ChatOverrideMap, ChatsListComponentProps } from './types';
import type { Id } from '@/shared/lib/ids';

interface UseChatListActionsParams {
  username: string;
  activeChatId?: Id;
  onChatOpen: ChatsListComponentProps['onChatOpen'];
  onJumpToMessage?: ChatsListComponentProps['onJumpToMessage'];
  createChat: (args: { user: UserRef }) => { unwrap: () => Promise<unknown> };
  setChatPinned: (args: { chatId: Id; pinned: boolean }) => { unwrap: () => Promise<unknown> };
  markChatRead: (args: { chatId: Id; lastMessageId?: Id | null }) => {
    unwrap: () => Promise<{ unread_count: number; first_unread_message_id: Id | null }>;
  };
  refetch: () => void;
  chatsByIdRef: React.MutableRefObject<Record<Id, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setChatContextMenu: Dispatch<SetStateAction<ChatContextMenuState | null>>;
  setModal: (modal: ChatListModal | null) => void;
  translations: Translations;
}

// Chat list user actions: creating chats, opening a chat, the row context
// menu, pinning, and marking a chat read (each with optimistic updates).
export function useChatListActions(params: UseChatListActionsParams) {
  const {
    activeChatId, onChatOpen, onJumpToMessage, createChat, setChatPinned, markChatRead, refetch,
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
      await createChat({ user: { username: targetUser.trim() } }).unwrap();

      setTargetUser('');
      setModal({
        type: 'success',
        message: translations.chatCreated || 'Chat created successfully',
      });

      // The refetch will be triggered by WebSocket, but you can also manually refetch
      refetch();
    } catch (caught) {
      const error = asApiError(caught);
      setModal({
        type: 'error',
        message: error?.data?.detail || error?.message || 'Failed to create chat',
      });
    }
  };

  // Create chat directly with a selected username (used by suggestion click)
  const handleCreateChatWith = async (usernameTo: string) => {
    try {
      await createChat({ user: { username: usernameTo } }).unwrap();
      setTargetUser('');
      setModal({ type: 'success', message: translations.chatCreated || 'Chat created successfully' });
      refetch();
    } catch (caught) {
      const error = asApiError(caught);
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

  // Opens the chat of a search result at that message. The unread marker is left out: the result is the target.
  const handleOpenSearchHit = (hit: MessageSearchHit) => {
    const chat = chatsByIdRef.current[hit.chatId];
    if (!chat) {
      refetch();
      return;
    }
    if (chat.id !== activeChatId) {
      onChatOpen(
        chat.id, chat.name, chat.interlocutor_deleted, chat.type, chat.display_name, chat.is_online, chat.last_seen, null,
        chat.avatar_url, chat.pending_approval_request,
      );
    }
    onJumpToMessage?.(chat.id, hit.id);
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

  const handleTogglePinnedChat = async (chatId: Id) => {
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
    } catch (caught) {
      const error = asApiError(caught);
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

  const handleMarkChatRead = async (chatId: Id) => {
    const chat = chatsByIdRef.current[chatId];
    const previousUnreadCount = chat?.unread_count ?? 0;
    const previousFirstUnreadId = chat?.first_unread_message_id ?? null;
    setChatContextMenu((current) => current?.chatId === chatId
      ? { ...current, unreadCount: 0 }
      : current);
    setChatOverrides((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        unread_count: 0,
        first_unread_message_id: null,
      },
    }));

    try {
      // A successful mark-all means everything known is read; don't let a stale
      // server summary resurrect the badge.
      await markChatRead({ chatId, lastMessageId: chatsByIdRef.current[chatId]?.last_message?.id }).unwrap();
    } catch (caught) {
      const error = asApiError(caught);
      setChatOverrides((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          unread_count: previousUnreadCount,
          first_unread_message_id: previousFirstUnreadId,
        },
      }));
      setChatContextMenu((current) => current?.chatId === chatId
        ? { ...current, unreadCount: previousUnreadCount }
        : current);
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
    handleOpenSearchHit,
    handleChatContextMenu,
    handleTogglePinnedChat,
    handleMarkChatRead,
  };
}
