import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import { useRef } from 'react';
import { Message, ModalState } from '@/entities/message';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { useChat } from './useChat';

interface ChatRoomStateOptions {
  isPreview: boolean;
  chatId: EntityId;
  username: string;
  token: string;
  onBack: () => void;
  userId: EntityId;
  firstUnreadMessageId?: EntityId | null;
  onPresenceUpdate: (update: { username: string; is_online: boolean; last_seen: string | null }) => void;
  previewModal: ModalState | null;
  setPreviewModal: (modal: ModalState | null) => void;
}

export const useChatRoomState = ({
  isPreview,
  chatId,
  username,
  token,
  onBack,
  userId,
  firstUnreadMessageId,
  onPresenceUpdate,
  previewModal,
  setPreviewModal,
}: ChatRoomStateOptions) => {
  const chatState = useChat(chatId, username, token, onBack, userId, firstUnreadMessageId, onPresenceUpdate);
  const previewWebSocketRef = useRef<SocketSender | null>(null);
  if (!isPreview) return chatState;

  return {
    ...chatState,
    messages: [] as Message[],
    setMessageInput: (_input: string) => {},
    contextMenu: null,
    setContextMenu: (_menu: typeof chatState.contextMenu) => {},
    replyTo: null,
    setReplyTo: (_message: Message | null) => {},
    editingMessage: null,
    setEditingMessage: (_message: Message | null) => {},
    selectedUser: null,
    setSelectedUser: (_username: string | null) => {},
    modal: previewModal,
    setModal: setPreviewModal,
    highlightedMessageId: null,
    isLoadingInitialMessages: false,
    isLoadingOlderMessages: false,
    isLoadingNewerMessages: false,
    hasMoreMessages: false,
    hasMoreNewerMessages: false,
    scrollToMessage: (_messageId: EntityId) => {},
    loadOlderMessages: async () => {},
    loadNewerMessages: async () => {},
    loadLatestMessages: async () => {},
    markMessagesRead: async (_messageIds: EntityId[]) => {},
    handleSendMessage: () => {},
    handleResendMessage: (_message: Message) => {},
    handleFileUpload: async (_file: File | File[]) => {},
    createOptimisticUploadMessage: (_file: Blob, _fileName: string, _fileType?: string, _caption?: string) => null,
    updateOptimisticUploadProgress: (_messageId: EntityId, _percent: number) => {},
    markOptimisticUploadFailed: (_messageId: EntityId, _errorMessage?: string) => {},
    settleOptimisticUpload: (_messageId: EntityId) => {},
    handleDeleteChat: () => {},
    getFormattedDateLabel: (timestamp: string) => formatDateLabel(timestamp, 'en', new Date(), new Date()),
    getMessageTime: (timestamp: string) => formatTime(timestamp, 'en'),
    renderMessageContent: (message: Message) => typeof message.content === 'string' ? message.content : '',
    wsRef: previewWebSocketRef,
  };
};
