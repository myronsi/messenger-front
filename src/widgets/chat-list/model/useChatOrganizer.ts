import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Chat } from '@/entities/message';
import { useReorderPinnedChatsMutation, useSetChatArchivedMutation } from '@/entities/chat';
import { asApiError } from '@/shared/lib/apiError';
import { toast } from '@/shared/ui/sonner';
import type { ChatContextMenuState, ChatListModal, ChatOverride, ChatOverrideMap, Translations } from './types';

interface ChatOrganizerOptions {
  chatsByIdRef: MutableRefObject<Record<EntityId, Chat>>;
  setChatOverrides: Dispatch<SetStateAction<ChatOverrideMap>>;
  setChatContextMenu: Dispatch<SetStateAction<ChatContextMenuState | null>>;
  setModal: (modal: ChatListModal | null) => void;
  refetch: () => void;
  translations: Translations;
}

export function useChatOrganizer({ chatsByIdRef, setChatOverrides, setChatContextMenu, setModal, refetch, translations }: ChatOrganizerOptions) {
  const [setChatArchived] = useSetChatArchivedMutation();
  const [reorderPinnedChats] = useReorderPinnedChatsMutation();
  const override = (chatId: EntityId, patch: ChatOverride) =>
    setChatOverrides((prev) => ({ ...prev, [chatId]: { ...(prev[chatId] || {}), ...patch } }));
  const fail = (caught: unknown) => {
    const error = asApiError(caught);
    setModal({ type: 'error', message: error?.data?.detail || error?.message || translations.errorLoading });
  };

  const handleToggleArchived = async (chatId: EntityId) => {
    const chat = chatsByIdRef.current[chatId];
    const archived = !chat?.is_archived;
    setChatContextMenu(null);
    override(chatId, archived ? { is_archived: true, is_pinned: false, pin_position: null } : { is_archived: false });
    try {
      await setChatArchived({ chatId, archived }).unwrap();
      toast(archived ? translations.chatOrganizer.archived : translations.chatOrganizer.unarchived);
      refetch();
    } catch (caught) {
      override(chatId, { is_archived: !!chat?.is_archived, is_pinned: !!chat?.is_pinned, pin_position: chat?.pin_position ?? null });
      fail(caught);
    }
  };

  const handleReorderPinned = async (ids: EntityId[]) => {
    const before = ids.map((id) => [id, chatsByIdRef.current[id]?.pin_position ?? null] as const);
    ids.forEach((id, index) => override(id, { pin_position: index }));
    try {
      await reorderPinnedChats(ids).unwrap();
      refetch();
    } catch (caught) {
      before.forEach(([id, position]) => override(id, { pin_position: position }));
      fail(caught);
    }
  };

  const openChatMenuAt = (chat: Chat, x: number, y: number) => {
    if (chat.pending_approval_request) return;
    setChatContextMenu({ x, y, chatId: chat.id, isPinned: !!chat.is_pinned, isArchived: !!chat.is_archived, unreadCount: chat.unread_count || 0 });
  };

  return { handleToggleArchived, handleReorderPinned, openChatMenuAt };
}
