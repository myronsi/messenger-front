import { useRef } from 'react';
import { Message } from '@/entities/message';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { useChat } from './useChat';

interface PreviewModal {
  type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
  message: string;
  onConfirm?: () => void;
}

interface ChatRoomStateOptions {
  isPreview: boolean;
  chatId: number;
  username: string;
  token: string;
  onBack: () => void;
  userId: number;
  firstUnreadMessageId?: number | null;
  onPresenceUpdate: (update: { username: string; is_online: boolean; last_seen: string | null }) => void;
  previewModal: PreviewModal | null;
  setPreviewModal: (modal: PreviewModal | null) => void;
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
  const previewWebSocketRef = useRef<WebSocket | null>(null);
  if (!isPreview) return chatState;

  return {
    ...chatState,
    messages: [] as Message[],
    messageInput: '',
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
    scrollToMessage: (_messageId: number) => {},
    loadOlderMessages: async () => {},
    loadNewerMessages: async () => {},
    markMessagesRead: async (_messageIds: number[]) => {},
    handleSendMessage: () => {},
    handleResendMessage: (_message: Message) => {},
    handleFileUpload: async (_file: File) => {},
    createOptimisticUploadMessage: (_file: Blob, _fileName: string, _fileType?: string, _caption?: string) => null,
    updateOptimisticUploadProgress: (_messageId: number, _percent: number) => {},
    markOptimisticUploadFailed: (_messageId: number, _errorMessage?: string) => {},
    settleOptimisticUpload: (_messageId: number) => {},
    handleDeleteChat: () => {},
    getFormattedDateLabel: (timestamp: string) => formatDateLabel(timestamp, 'en', new Date(), new Date()),
    getMessageTime: (timestamp: string) => formatTime(timestamp, 'en'),
    renderMessageContent: (message: Message) => typeof message.content === 'string' ? message.content : '',
    wsRef: previewWebSocketRef,
  };
};
