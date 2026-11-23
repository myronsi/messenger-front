import { apiClient } from '@/shared/api/client';
import { contractQuery } from '@/shared/api/queryResult';
import { messageModel } from '@/shared/api/goModels';
import { getOfflineDb } from '@/shared/offline';
import { attachmentView } from '../model/videoAttachment';
import type { FileMessageContent, Message } from '../model/types';
import { findLinks } from './chatLinksApi';

export { findLinks } from './chatLinksApi';
export { isUnreachable } from './offlineHistory';

export type GlobalSearchKind = 'visual' | 'link' | 'file';
export type GlobalSearchType = 'text' | 'file' | 'voice' | 'sticker';

export interface GlobalSearchFilters {
  chatId?: string;
  senderId?: string;
  type?: GlobalSearchType;
  from?: string;
  to?: string;
}

export interface GlobalSearchHit {
  chatId: string;
  message: Message;
  highlight: string | null;
}

export interface GlobalSearchArgs {
  q: string;
  kind?: GlobalSearchKind;
  filters: GlobalSearchFilters;
  after?: string | null;
  limit?: number;
}

const PICTURE_NAME = /\.(jpe?g|png|gif|webp|avif|heic)$/i;

const attachmentOf = (message: Message): FileMessageContent | null =>
  (message.content && typeof message.content === 'object' ? message.content : null);

export const globalSearchText = (message: Message) => {
  const attachment = attachmentOf(message);
  if (!attachment) return typeof message.content === 'string' ? message.content : '';
  return attachment.caption || '';
};

export const messageTypeOf = (message: Message): GlobalSearchType | 'system' => {
  if (message.is_system || message.system_event) return 'system';
  if (message.sticker) return 'sticker';
  const attachment = attachmentOf(message);
  if (!attachment) return 'text';
  return attachment.kind === 'voice' || attachment.file_type === 'voice' ? 'voice' : 'file';
};

const viewOf = (attachment: FileMessageContent) => attachmentView(attachment, PICTURE_NAME.test(attachment.file_name || ''));

export const messageHasKind = (message: Message, kind: GlobalSearchKind) => {
  if (kind === 'link') return findLinks(globalSearchText(message)).length > 0;
  const attachment = attachmentOf(message);
  if (!attachment || message.sticker || !attachment.file_url) return false;
  if (kind === 'visual') return !!attachment.album?.length || ['image', 'video'].includes(viewOf(attachment));
  return attachment.kind ? attachment.kind === 'file' : viewOf(attachment) === 'file';
};

const timeOf = (value: string) => Date.parse(value);

export const globalSearchFilter = (kind: GlobalSearchKind | undefined, filters: GlobalSearchFilters) => (message: Message) => {
  if (message.is_deleted || message.is_system) return false;
  if (kind && !messageHasKind(message, kind)) return false;
  if (filters.senderId && String(message.sender_id ?? '') !== filters.senderId) return false;
  if (filters.type && messageTypeOf(message) !== filters.type) return false;
  if (filters.from && timeOf(message.timestamp) < timeOf(filters.from)) return false;
  return !(filters.to && timeOf(message.timestamp) >= timeOf(filters.to));
};

export const searchMessagesLocal = async ({ q, kind, filters, limit = 100 }: GlobalSearchArgs): Promise<GlobalSearchHit[] | null> => {
  const db = await getOfflineDb();
  if (!db) return null;
  const accept = globalSearchFilter(kind, filters);
  const hits = q
    ? await db.search<Message>(q, filters.chatId, limit, accept)
    : kind ? await db.latest<Message>(accept, limit, filters.chatId) : [];
  return hits.map(({ chatId, message }) => ({ chatId, message, highlight: null }));
};

export const searchMessagesRemote = ({ q, kind, filters, after, limit = 30 }: GlobalSearchArgs, signal?: AbortSignal) => contractQuery(async () => {
  const response = await apiClient.GET('/search/messages', {
    params: { query: {
      ...(q ? { q } : {}), ...(kind ? { kind } : {}), ...(filters.chatId ? { chat_id: filters.chatId } : {}),
      ...(filters.senderId ? { sender_id: filters.senderId } : {}), ...(filters.type ? { type: filters.type } : {}),
      ...(filters.from ? { from: filters.from } : {}), ...(filters.to ? { to: filters.to } : {}), limit, ...(after ? { after } : {}),
    } },
    signal,
  });
  const data = response.data;
  return { ...response, data: data ? {
    items: data.items.map((hit): GlobalSearchHit => ({
      chatId: String(hit.message.chat_id), message: messageModel(hit.message), highlight: hit.highlight ?? null,
    })),
    nextCursor: data.next_cursor ?? null,
  } : undefined };
});
