import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import { createTempMessageId } from '@/shared/api/tempMessageId';
import type { EntityId } from '@/shared/api/entityId';
import type { Message, MessageSticker } from '@/entities/message';
import type { Sticker } from '@/entities/sticker';
import { createOptimisticMessage } from './optimisticMessage';
import { mergeIncomingMessage } from './messageUpdates';
import { createdMessage } from './unsentMessages';
import type { SetMessages } from './types';

interface StickerSenderOptions {
  chatId: EntityId;
  username: string;
  senderId: () => EntityId | undefined;
  setMessages: SetMessages;
  takeReply: () => Message | null;
  markMessageFailed: (messageId: EntityId, message?: string) => void;
  notSent: () => string;
}

export const messageSticker = (sticker: Sticker): MessageSticker => ({
  id: sticker.id,
  pack_id: sticker.pack_id,
  pack_slug: sticker.pack_slug,
  emoji: sticker.emoji,
  image_url: sticker.image.url,
  is_animated: sticker.is_animated,
});

const problemDetail = (error: unknown) => {
  const data = (error as { data?: { detail?: unknown } } | null)?.data;
  return typeof data?.detail === 'string' && data.detail ? data.detail : undefined;
};

export const createStickerSender = ({ chatId, username, senderId, setMessages, takeReply, markMessageFailed, notSent }: StickerSenderOptions) => {
  const post = async (tempId: EntityId, sticker: MessageSticker, replyTo?: EntityId | null) => {
    if (sticker.id == null) return;
    try {
      const created = contractData(await apiClient.POST('/chats/{chat_id}/messages', {
        params: { path: { chat_id: String(chatId) } },
        body: { type: 'sticker', sticker_id: String(sticker.id), client_temp_id: String(tempId), ...(replyTo != null ? { reply_to: String(replyTo) } : {}) },
      }));
      const saved = createdMessage(created);
      if (saved) setMessages((previous) => mergeIncomingMessage(previous, saved));
    } catch (error) {
      markMessageFailed(tempId, problemDetail(error) ?? notSent());
    }
  };

  const send = (sticker: Sticker) => {
    const tempId = createTempMessageId();
    const reply = takeReply();
    const content = messageSticker(sticker);
    setMessages((previous) => [...previous, createOptimisticMessage(tempId, username, senderId(), {
      type: 'message', content: sticker.emoji, reply_to: reply?.id ?? null, sticker: content,
    })]);
    void post(tempId, content, reply?.id);
  };

  return { send, post };
};
