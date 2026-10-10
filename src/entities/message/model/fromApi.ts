import type { Schema } from '@/shared/api/contract';
import type { Id } from '@/shared/lib/ids';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { rememberUser } from '@/shared/lib/userDirectory';
import type { ChatLastMessage, FileMessageContent, Message, ReactionInfo, ReadReceiptInfo } from './types';

export type ApiMessage = Schema<'Message'>;
export type ApiAttachment = Schema<'Attachment'>;

// The contract's waveform bars are 0-255; the player draws 0-1.
const WAVEFORM_MAX = 255;

const senderName = (message: ApiMessage) => (
  message.sender ? message.sender.contact_name?.trim() || message.sender.display_name : ''
);

// toFileContent describes an attachment the way the message UI shows it: images by their file name, voice
// messages by file_type "voice", everything else as a file to download.
export const toFileContent = (attachment: ApiAttachment, caption?: string | null): FileMessageContent => ({
  file_url: attachment.url,
  file_name: attachment.filename,
  file_type: attachment.kind === 'voice' ? 'voice' : attachment.content_type,
  file_size: attachment.size,
  kind: attachment.kind,
  ...(caption?.trim() ? { caption: caption.trim() } : {}),
  ...(attachment.width ? { image_width: attachment.width } : {}),
  ...(attachment.height ? { image_height: attachment.height } : {}),
  ...(attachment.thumbnail_url ? { thumbnail_url: attachment.thumbnail_url } : {}),
  ...(attachment.duration_ms != null || attachment.waveform
    ? {
        audio_metadata: {
          ...(attachment.duration_ms != null ? { duration: attachment.duration_ms / 1000 } : {}),
          ...(attachment.waveform ? { waveform: attachment.waveform.map((bar) => bar / WAVEFORM_MAX) } : {}),
        },
      }
    : {}),
});

const toReactions = (message: ApiMessage): ReactionInfo[] => message.reactions.map((reaction) => ({
  user_id: reaction.user_id,
  reaction: reaction.emoji,
}));

const toReadReceipts = (message: ApiMessage): ReadReceiptInfo[] => message.read_by.map((receipt) => ({
  user_id: receipt.user_id,
  read_at: receipt.read_at,
}));

// toAppMessage maps the contract's Message to the message the list shows. The type is explicit in the
// contract: a message is a file only if it has an attachment, never because its text looks like one.
export const toAppMessage = (message: ApiMessage, currentUserId?: Id | null): Message => {
  rememberUser(message.sender?.id, message.sender?.username);
  const isFile = (message.type === 'file' || message.type === 'voice') && message.attachment;
  return {
    id: message.id,
    client_temp_id: message.client_temp_id ?? null,
    sender_id: message.sender?.id,
    is_own: Boolean(currentUserId && message.sender?.id === currentUserId),
    sender: senderName(message),
    sender_username: message.sender?.username ?? null,
    avatar_url: message.sender?.avatar_url || DEFAULT_AVATAR,
    content: isFile && message.attachment ? toFileContent(message.attachment, message.content) : (message.content ?? ''),
    type: isFile ? 'file' : 'message',
    timestamp: message.created_at,
    edited_at: message.edited_at,
    reply_to: message.reply_to,
    is_deleted: message.is_deleted,
    forwarded_from: message.forwarded_from
      ? {
          message_id: message.forwarded_from.message_id,
          sender_id: message.forwarded_from.sender_id,
          sender_name: message.forwarded_from.sender_name,
        }
      : null,
    reactions: toReactions(message),
    read_by: toReadReceipts(message),
  };
};

// toChatLastMessage is the preview of a chat's newest message in the chat list.
export const toChatLastMessage = (message: ApiMessage): ChatLastMessage => {
  const isFile = (message.type === 'file' || message.type === 'voice') && message.attachment;
  return {
    id: message.id,
    sender_id: message.sender?.id ?? '',
    sender_name: senderName(message),
    content: isFile && message.attachment ? toFileContent(message.attachment, message.content) : (message.content ?? ''),
    type: isFile ? 'file' : 'message',
    timestamp: message.created_at,
    edited_at: message.edited_at,
    read_by: toReadReceipts(message),
    forwarded_from: message.forwarded_from
      ? { message_id: message.forwarded_from.message_id, sender_id: message.forwarded_from.sender_id, sender_name: message.forwarded_from.sender_name }
      : null,
  };
};
