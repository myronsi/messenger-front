import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ModalState } from '@/entities/message';

export type ChatTranslations = ReturnType<typeof useLanguage>['translations'];

export type ChatModal = ModalState;

export interface ChatContextMenu {
  x: number;
  y: number;
  messageId: EntityId;
  isMine: boolean;
}

export interface ChatProps {
  chatId: EntityId;
  chatName: string;
  chatDisplayName?: string;
  interlocutorIsOnline?: boolean;
  interlocutorLastSeen?: string | null;
  interlocutorAvatarUrl?: string;
  username: string;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: EntityId | null;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  onOpenUserProfile?: (username: string) => void;
  searchRequestKey?: number;
  messageJumpRequest?: { messageId: EntityId; key: number } | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
  initialPendingApprovalRequest?: boolean;
  initialPendingApprovalMessage?: string;
  onChatCreated?: (newId: EntityId, newName: string) => void;
}
