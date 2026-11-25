import type { EntityId } from '@/shared/api/entityId';
import type { ImportedMessage, SenderAssignment, StartImportRequest } from '../api/importTypes';
import type { ParsedChat, ParsedMessage, ParsedNotice } from './types';

export type ImportTarget = { kind: 'chat'; chatId: EntityId } | { kind: 'newGroup'; title: string };

export type SkipReason = 'fileTooLarge' | 'fileUnsupported' | 'fileMissing';

export const MAX_CONTENT_LENGTH = 4096;

export interface BuildContext {
  attachmentIds: ReadonlyMap<string, EntityId>;
  skipped: ReadonlyMap<string, SkipReason>;
  noticeText: (notice: ParsedNotice) => string;
}

const assignment = (assign: SenderAssignment | undefined) => {
  if (assign === 'me') return { me: true };
  return assign === null || assign === undefined ? {} : { user_id: String(assign) };
};

export const startRequest = (chat: ParsedChat, assignments: Record<string, SenderAssignment>): StartImportRequest => ({
  source: chat.source,
  message_count: chat.messages.length,
  file_count: chat.fileCount,
  first_at: chat.firstAt ?? new Date(0).toISOString(),
  last_at: chat.lastAt ?? new Date(0).toISOString(),
  senders: chat.senders.map((sender) => ({
    key: sender.key, name: sender.name.slice(0, 128) || '?', message_count: sender.messageCount, ...assignment(assignments[sender.key]),
  })),
});

const clip = (text: string) => (text.length > MAX_CONTENT_LENGTH ? `${text.slice(0, MAX_CONTENT_LENGTH - 1)}…` : text);

const withCaption = (line: string, caption: string) => clip(caption ? `${line}\n${caption}` : line);

const body = (message: ParsedMessage, context: BuildContext): Pick<ImportedMessage, 'type' | 'content' | 'attachment_ids'> => {
  if (message.notice) return { type: 'note', content: withCaption(context.noticeText(message.notice), message.text) };
  const attachment = message.attachment;
  if (!attachment) return { type: 'text', content: clip(message.text) };
  const id = context.attachmentIds.get(attachment.path);
  if (id === undefined) {
    const code = context.skipped.get(attachment.path) ?? 'fileMissing';
    return { type: 'note', content: withCaption(context.noticeText({ code, detail: attachment.name }), message.text) };
  }
  return { type: attachment.kind === 'voice' ? 'voice' : 'file', content: message.text ? clip(message.text) : null, attachment_ids: [String(id)] };
};

export const importedMessage = (message: ParsedMessage, context: BuildContext): ImportedMessage => {
  const content = body(message, context);
  return {
    index: message.index,
    ...(message.senderKey && content.type !== 'note' ? { sender_key: message.senderKey } : {}),
    original_at: message.originalAt,
    ...content,
    ...(message.replyToIndex === undefined ? {} : { reply_to_index: message.replyToIndex }),
  };
};
