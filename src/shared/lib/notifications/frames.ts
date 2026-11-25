import { alertIncomingMessage, type MessageKind } from './alerts';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { notificationAccount } from './api';

const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
const ATTACHMENT_KINDS: Record<string, MessageKind> = { image: 'photo', video: 'video', audio: 'audio', voice: 'voice', file: 'file' };
const RICH_KINDS = new Set(['poll', 'contact', 'location']);
const kindOf = (message: Record<string, unknown>): MessageKind => {
  if (message.type === 'sticker' || message.sticker) return 'sticker';
  if (RICH_KINDS.has(String(message.type))) return message.type as MessageKind;
  if (message.type === 'voice') return 'voice';
  if (Array.isArray(message.attachments) && message.attachments.length > 1) return 'album';
  const attachment = ATTACHMENT_KINDS[String(record(message.attachment).kind)];
  if (attachment) return attachment;
  return message.type === 'file' ? 'file' : 'text';
};
const richBody = (message: Record<string, unknown>) => {
  if (message.type === 'poll') return String(record(message.poll).question ?? '');
  if (message.type === 'location') return String(record(message.location).title ?? '');
  if (message.type === 'contact') return String(record(record(message.contact).user).display_name ?? '');
  return null;
};
export function notifyMessageFrame(frame: unknown, activeChatId?: string | number) {
  const event = record(frame);
  if (event.type !== 'message' && event.type !== 'chat_list_message') return;
  const message = record(event.type === 'message' ? record(event.data).message : event.last_message);
  if (Array.isArray(message.read_by) && message.read_by.some((item) => String(record(item).user_id) === notificationAccount())) return;
  const sender = record(message.sender);
  if (!sender.id && !message.sender_id) return;
  const timestamp = String(message.created_at || message.timestamp || '');
  if (!Number.isFinite(Date.parse(timestamp))) return;
  alertIncomingMessage({
    chatId: String(event.chat_id || ''), messageId: String(message.id || ''),
    senderId: String(sender.id || message.sender_id || ''),
    title: plainEmoji(String(sender.display_name || sender.username || message.sender_name || 'Messenger')),
    body: plainEmoji(richBody(message) ?? (typeof message.content === 'string' ? message.content : '')).slice(0, 160), timestamp,
    kind: kindOf(message), live: event.type === 'message',
  }, activeChatId);
}
