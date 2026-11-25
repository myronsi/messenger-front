import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import { createTempMessageId } from '@/shared/api/tempMessageId';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { richFields, richSendBody, richSummary, type Message, type MessageSticker, type RichSend } from '@/entities/message';
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
  richNotSent?: (send: RichSend) => string;
}

export const messageSticker = (sticker: Sticker): MessageSticker => ({
  id: sticker.id,
  pack_id: sticker.pack_id,
  pack_slug: sticker.pack_slug,
  emoji: sticker.emoji,
  image_url: sticker.image.url,
  panel_url: sticker.image.panel_url || undefined,
  message_url: sticker.image.message_url || undefined,
  is_animated: sticker.is_animated,
});

const RICH_WORDS = { poll: 'polls', contact: 'contactShare', location: 'locationShare' } as const;

export const richNotSentText = (send: RichSend, translations: Translations) => translations[RICH_WORDS[send.type]].notSent;

const PRIVACY_DETAIL = /block|privacy|allow|permission/i;

const privacyDetail = (error: unknown) => {
  const detail = (error as { data?: { detail?: unknown } } | null)?.data?.detail;
  return typeof detail === 'string' && PRIVACY_DETAIL.test(detail) ? detail : undefined;
};

export const createStickerSender = ({
  chatId, username, senderId, setMessages, takeReply, markMessageFailed, notSent, richNotSent,
}: StickerSenderOptions) => {
  const deliver = async (tempId: EntityId, body: ReturnType<typeof richSendBody> | { type: 'sticker'; sticker_id: string }, replyTo: EntityId | null | undefined,
    failure: () => string) => {
    try {
      const created = contractData(await apiClient.POST('/chats/{chat_id}/messages', {
        params: { path: { chat_id: String(chatId) } },
        body: { ...body, client_temp_id: String(tempId), ...(replyTo != null ? { reply_to: String(replyTo) } : {}) },
      }));
      const saved = createdMessage(created);
      if (saved) setMessages((previous) => mergeIncomingMessage(previous, saved));
    } catch (error) {
      markMessageFailed(tempId, privacyDetail(error) ?? failure());
    }
  };

  const post = async (tempId: EntityId, sticker: MessageSticker, replyTo?: EntityId | null) => {
    if (sticker.id == null) return;
    await deliver(tempId, { type: 'sticker', sticker_id: String(sticker.id) }, replyTo, notSent);
  };

  const postRich = (tempId: EntityId, send: RichSend, replyTo?: EntityId | null) =>
    deliver(tempId, richSendBody(send), replyTo, () => richNotSent?.(send) ?? notSent());

  const resend = (tempId: EntityId, message: Message) => {
    if (message.outgoing) return postRich(tempId, message.outgoing, message.reply_to);
    if (message.sticker) return post(tempId, message.sticker, message.reply_to);
    return undefined;
  };

  const sendRich = (send: RichSend) => {
    const tempId = createTempMessageId();
    const reply = takeReply();
    setMessages((previous) => [...previous, createOptimisticMessage(tempId, username, senderId(), {
      type: 'message', content: richSummary(send), reply_to: reply?.id ?? null, ...richFields(send),
    })]);
    void postRich(tempId, send, reply?.id);
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

  return { send, post, sendRich, resend };
};
