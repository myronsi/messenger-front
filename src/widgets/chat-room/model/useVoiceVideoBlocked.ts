import type { EntityId } from '@/shared/api/entityId';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';

export const useVoiceVideoBlocked = (chatId: EntityId, username: string) => {
  const { blocked } = useGetOneOnOneChatsQuery(username, {
    skip: !username,
    selectFromResult: ({ data }) => ({
      blocked: data?.chats.find((entry) => String(entry.id) === String(chatId))?.interlocutor_can_send_voice_video === false,
    }),
  });
  return blocked;
};
