import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import { createTempMessageId } from '@/shared/api/tempMessageId';
import type { EntityId } from '@/shared/api/entityId';
import type { Drawing, ImageDrawingTarget } from '@/shared/ui/drawing';

export const sendImageDrawing = async (chatId: EntityId, target: ImageDrawingTarget, drawing: Drawing) => {
  const clientTempId = String(createTempMessageId());
  const created = contractData(await apiClient.POST('/chats/{chat_id}/messages', {
    params: { path: { chat_id: String(chatId) } },
    body: {
      client_temp_id: clientTempId,
      type: 'file',
      attachment_id: target.attachmentId,
      reply_to: String(target.messageId),
      drawings: [{ attachment_id: target.attachmentId, drawing }],
    },
  }));
  return { clientTempId, created };
};
