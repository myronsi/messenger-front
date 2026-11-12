import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import { unsentModel } from '@/shared/api/goModels';
import type { components } from '@/shared/api/generated/schema';
import type { EntityId } from '@/shared/api/entityId';
import type { FileMessageContent, Message } from '../model/types';

type ServerUnsent = components['schemas']['UnsentMessage'];

export const SERVER_KEPT_ERRORS = new Set(['forbidden', 'blocked_by_user', 'rate_limited', 'internal_error']);

export interface KeptSend {
  tempId: number;
  code: string;
  fields: Pick<Message, 'type' | 'content' | 'sticker' | 'reply_to' | 'timestamp'>;
}

const keptSend = (item: ServerUnsent): KeptSend | null => {
  const tempId = Number(item.client_temp_id);
  if (!Number.isSafeInteger(tempId) || tempId >= 0) return null;
  return { tempId, code: item.error_code, fields: { ...unsentModel(item), reply_to: item.reply_to, timestamp: item.created_at } };
};

export const fetchServerUnsent = async (chatId: EntityId): Promise<KeptSend[]> => {
  const data = contractData(await apiClient.GET('/chats/{chat_id}/unsent', { params: { path: { chat_id: String(chatId) } } }));
  return data.items.map(keptSend).filter((item): item is KeptSend => item !== null);
};

export const discardServerUnsent = async (chatId: EntityId, tempId: EntityId) => {
  const result = await apiClient.DELETE('/chats/{chat_id}/unsent/{client_temp_id}', {
    params: { path: { chat_id: String(chatId), client_temp_id: String(tempId) } },
  });
  if (!result.response.ok && result.response.status !== 404) contractData(result);
};

export const keptAttachmentIds = (message: Message): string[] => {
  if (typeof message.content === 'string' || !message.content) return [];
  const content = message.content as FileMessageContent & { attachment_id?: string; album?: { attachment_id?: string }[] };
  const ids = (content.album?.length ? content.album : [content]).map((item) => item.attachment_id);
  return ids.every((id): id is string => !!id) ? ids : [];
};

export const resendKeptFile = async (chatId: EntityId, message: Message) => {
  const ids = keptAttachmentIds(message);
  const caption = typeof message.content === 'string' ? undefined : message.content?.caption;
  return contractData(await apiClient.POST('/chats/{chat_id}/messages', {
    params: { path: { chat_id: String(chatId) } },
    body: {
      client_temp_id: String(message.client_temp_id ?? message.id), type: (message.content as FileMessageContent).file_type === 'voice' ? 'voice' : 'file',
      ...(ids.length > 1 ? { attachment_ids: ids } : { attachment_id: ids[0] }),
      ...(caption ? { content: caption } : {}), ...(message.reply_to != null ? { reply_to: String(message.reply_to) } : {}),
    },
  }));
};
