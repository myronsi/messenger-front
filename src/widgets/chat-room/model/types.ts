import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ModalState } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';

export type ChatTranslations = ReturnType<typeof useLanguage>['translations'];

export type ChatModal = ModalState;

export interface ChatContextMenu {
  x: number;
  y: number;
  messageId: Id;
  isMine: boolean;
}

export interface ChatProps {
  chatId: Id;
  chatName: string;
  chatDisplayName?: string;
  interlocutorIsOnline?: boolean;
  interlocutorLastSeen?: string | null;
  interlocutorAvatarUrl?: string;
  username: string;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: Id | null;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  onOpenUserProfile?: (username: string) => void;
  searchRequestKey?: number;
  messageJumpRequest?: { messageId: Id; key: number } | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
  initialPendingApprovalRequest?: boolean;
  initialPendingApprovalMessage?: string;
  onChatCreated?: (newId: Id, newName: string) => void;
}
