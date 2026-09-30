import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Message } from '@/entities/message';

export type ChatTranslations = ReturnType<typeof useLanguage>['translations'];

export interface ChatModal {
  type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser' | 'deleteMessageChoice';
  message?: string;
  consequences?: string[];
  onConfirm?: () => void;
  isMessageSender?: boolean;
  messageId?: number;
  onDeleteForMe?: () => void | Promise<void>;
  onDeleteForAll?: () => void;
}

export interface ChatContextMenu {
  x: number;
  y: number;
  messageId: number;
  isMine: boolean;
}

export interface ChatProps {
  chatId: number;
  chatName: string;
  chatDisplayName?: string;
  interlocutorIsOnline?: boolean;
  interlocutorLastSeen?: string | null;
  interlocutorAvatarUrl?: string;
  username: string;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: number | null;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  onOpenUserProfile?: (username: string) => void;
  searchRequestKey?: number;
  messageJumpRequest?: { messageId: number; key: number } | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
  initialPendingApprovalRequest?: boolean;
  initialPendingApprovalMessage?: string;
  onChatCreated?: (newId: number, newName: string) => void;
}
