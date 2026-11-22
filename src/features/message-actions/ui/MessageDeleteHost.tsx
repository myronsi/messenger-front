import type { EntityId } from '@/shared/api/entityId';
import { closeMessageDelete, useMessageDeleteRequest } from '../model/deleteRequest';
import { DeleteMessagesDialog } from './DeleteMessagesDialog';

interface MessageDeleteHostProps {
  chatId: EntityId;
  peerName?: string;
  savedChat?: boolean;
}

export const MessageDeleteHost = ({ chatId, peerName, savedChat = false }: MessageDeleteHostProps) => {
  const request = useMessageDeleteRequest();
  if (!request || String(request.chatId) !== String(chatId)) return null;
  return (
    <DeleteMessagesDialog count={1} everyone={request.forEveryone && !savedChat ? { direct: request.direct, peerName } : null}
      onCancel={closeMessageDelete}
      onConfirm={(forEveryone) => {
        closeMessageDelete();
        if (forEveryone || (savedChat && request.forEveryone)) request.deleteForEveryone();
        else request.deleteForMe();
      }} />
  );
};
