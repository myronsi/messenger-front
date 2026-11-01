import { alertIncomingMessage } from './alerts';

const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
export function notifyMessageFrame(frame: unknown, activeChatId?: string | number) {
  const event = record(frame);
  if (event.type !== 'message' && event.type !== 'chat_list_message') return;
  const message = record(event.type === 'message' ? record(event.data).message : event.last_message);
  const sender = record(message.sender);
  if (!sender.id && !message.sender_id) return;
  const timestamp = String(message.created_at || message.timestamp || '');
  if (!Number.isFinite(Date.parse(timestamp))) return;
  alertIncomingMessage({
    chatId: String(event.chat_id || ''), messageId: String(message.id || ''),
    senderId: String(sender.id || message.sender_id || ''),
    title: String(sender.display_name || sender.username || message.sender_name || 'Messenger'),
    body: typeof message.content === 'string' ? message.content.slice(0, 160) : 'New attachment', timestamp,
  }, activeChatId);
}
