import type { EntityId } from '@/shared/api/entityId';
import { useGetOneOnOneChatsQuery } from '@/entities/chat';

export const useVoiceVideoBlocked = (chatId: EntityId, username: string) => {
  const { data } = useGetOneOnOneChatsQuery(username, { skip: !username });
  const chat = data?.chats.find((entry) => String(entry.id) === String(chatId));
  return chat?.interlocutor_can_send_voice_video === false;
};
