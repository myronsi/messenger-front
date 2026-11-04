import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';
import { DEFAULT_AVATAR } from '@/shared/base/ui';

export const createOptimisticMessage = (
  tempId: number,
  username: string,
  senderId: EntityId | undefined,
  fields: Pick<Message, 'type' | 'content' | 'reply_to'> & Partial<Message>,
): Message => ({
  id: tempId,
  client_temp_id: tempId,
  sender_id: senderId,
  is_own: true,
  sender: username,
  sender_username: username,
  timestamp: new Date().toISOString(),
  avatar_url: DEFAULT_AVATAR,
  is_deleted: false,
  reactions: [],
  read_by: [],
  ...fields,
});
