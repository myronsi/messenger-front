import { Message, ModalState } from '@/entities/message';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import { useChat } from './useChat';
import type { Id } from '@/shared/lib/ids';

interface ChatRoomStateOptions {
  isPreview: boolean;
  chatId: Id;
  username: string;
  token: string;
  onBack: () => void;
  userId: Id;
  firstUnreadMessageId?: Id | null;
  focusMessageId?: Id | null;
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
  focusMessageId,
  onPresenceUpdate,
  previewModal,
  setPreviewModal,
}: ChatRoomStateOptions) => {
  const chatState = useChat(chatId, username, token, onBack, userId, firstUnreadMessageId, onPresenceUpdate, focusMessageId);
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
    scrollToMessage: (_messageId: Id) => {},
    loadOlderMessages: async () => {},
    loadNewerMessages: async () => {},
    loadLatestMessages: async () => {},
    markMessagesRead: async (_messageIds: Id[]) => {},
    handleSendMessage: () => {},
    handleResendMessage: (_message: Message) => {},
    handleFilesUpload: (_files: File[], _caption?: string) => {},
    cancelUpload: (_messageId: Id) => {},
    handleVoiceMessage: (_file: Blob, _fileName: string) => {},
    createOptimisticUploadMessage: (_file: Blob, _fileName: string, _fileType?: string, _caption?: string) => null,
    updateOptimisticUploadProgress: (_messageId: Id, _percent: number) => {},
    markOptimisticUploadFailed: (_messageId: Id, _errorMessage?: string) => {},
    settleOptimisticUpload: (_messageId: Id) => {},
    handleDeleteChat: () => {},
    getFormattedDateLabel: (timestamp: string) => formatDateLabel(timestamp, 'en', new Date(), new Date()),
    getMessageTime: (timestamp: string) => formatTime(timestamp, 'en'),
    renderMessageContent: (message: Message) => typeof message.content === 'string' ? message.content : '',
  };
};
