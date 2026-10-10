import type { Translations } from '@/shared/contexts/LanguageContext';
import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useChatSocket, useMessageEvents, type ChatServerEvent, type ChatTransport } from '@/features/chat-core';
import { toGroupDetails } from '@/entities/chat';
import type { Message, ModalState } from '@/entities/message';
import type { GroupTranslations, RawGroupDetails } from './groupChatTypes';
import type { Id } from '@/shared/lib/ids';

interface UseGroupChatSocketArgs {
  chatId: Id;
  translations: GroupTranslations;
  transport: ChatTransport;
  currentUserIdRef: MutableRefObject<Id>;
  translationsRef: MutableRefObject<Translations>;
  onBackRef: MutableRefObject<() => void>;
  applyGroupDetails: (raw: RawGroupDetails, syncCache?: boolean) => void;
  refreshGroupDetails: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>;
  markMessageFailed: (messageId: Id, message?: string) => boolean;
  onReconnected: () => void;
}

// Group chats use the chat's share of the socket and add the group events on top: a group_updated event
// carries the whole group, and a member who is no longer in it was removed.
export const useGroupChatSocket = ({
  chatId, translations, transport, currentUserIdRef, translationsRef, onBackRef,
  applyGroupDetails, refreshGroupDetails, setMessages, setModal, markMessageFailed, onReconnected,
}: UseGroupChatSocketArgs) => {
  const handleGroupEvent = useCallback((event: ChatServerEvent) => {
    if (event.type !== 'group_updated') return;
    const { group } = event.data;
    const me = currentUserIdRef.current;
    if (me && !group.members.some((member) => member.user.id === me)) {
      setModal({ type: 'error', message: translations.groupDeletedOrUnavailable });
      setTimeout(() => onBackRef.current(), 1000);
      return;
    }
    applyGroupDetails(toGroupDetails(group));
  }, [applyGroupDetails, currentUserIdRef, onBackRef, setModal, translations]);

  const handleSocketEvent = useMessageEvents({
    chatId, transport, currentUserIdRef, translationsRef, onBackRef, setMessages, setModal,
    markMessageFailed, chatDeletedKey: 'groupDeleted', onExtraEvent: handleGroupEvent,
  });

  useChatSocket({
    chatId,
    onEvent: handleSocketEvent,
    onConnectionFailed: () => setModal({ type: 'error', message: translationsRef.current.webSocketError }),
    onReconnected: () => {
      onReconnected();
      // Membership or settings may have changed while disconnected.
      void refreshGroupDetails();
    },
  });
};
