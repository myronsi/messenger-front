import type { Translations } from '@/shared/contexts/LanguageContext';
import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useChatSocket, useMessageEvents, type ChatTransport, type ServerEvent } from '@/features/chat-core';
import type { Message, ModalState } from '@/entities/message';
import type { GroupTranslations, RawGroupDetails } from './groupChatTypes';

interface UseGroupChatSocketArgs {
  token: string;
  chatId: number;
  username: string;
  translations: GroupTranslations;
  transport: ChatTransport;
  currentUserIdRef: MutableRefObject<number>;
  translationsRef: MutableRefObject<Translations>;
  onBackRef: MutableRefObject<() => void>;
  applyGroupDetails: (raw: RawGroupDetails, syncCache?: boolean) => void;
  refreshGroupDetails: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>;
  markMessageFailed: (messageId: number, message?: string) => boolean;
  markLatestPendingMessageFailed: (message?: string) => boolean;
  onReconnected: () => void;
}

// Group chats reuse the shared message socket and only add the group-membership events on top.
export const useGroupChatSocket = ({
  token, chatId, username, translations, transport, currentUserIdRef, translationsRef, onBackRef,
  applyGroupDetails, refreshGroupDetails, setMessages, setModal, markMessageFailed, markLatestPendingMessageFailed,
  onReconnected,
}: UseGroupChatSocketArgs) => {
  const handleGroupEvent = useCallback((event: ServerEvent, socket: WebSocket) => {
    if (event.type === 'group_updated' && event.group?.chat_id === chatId) {
      if (event.group.participants) applyGroupDetails(event.group as RawGroupDetails);
      else void refreshGroupDetails();
      if (event.removed_username === username) {
        setModal({ type: 'error', message: translations.groupDeletedOrUnavailable });
        socket.close(1000, 'Removed from group');
        setTimeout(() => onBackRef.current(), 1000);
      }
    } else if ((event.type === 'group_invite_rejected' || event.type === 'group_invite_approved') && event.chat_id === chatId) {
      void refreshGroupDetails();
    }
  }, [applyGroupDetails, chatId, onBackRef, refreshGroupDetails, setModal, translations, username]);

  const handleSocketEvent = useMessageEvents({
    chatId, username, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
    markMessageFailed, markLatestPendingMessageFailed, chatDeletedKey: 'groupDeleted', onExtraEvent: handleGroupEvent,
  });

  useChatSocket({
    chatId, token, transport, onEvent: handleSocketEvent,
    onConnectionFailed: () => setModal({ type: 'error', message: translationsRef.current.webSocketError }),
    onReconnected: () => {
      onReconnected();
      // Membership or settings may have changed while disconnected.
      void refreshGroupDetails();
    },
  });
};