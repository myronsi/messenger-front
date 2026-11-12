import type { EntityId } from '@/shared/api/entityId';
import { isPersistedId } from '@/shared/api/entityId';
import type { FileMessageContent, ForwardedFrom, Message, MessageSticker, ReactionInfo, ReadReceiptInfo, SystemEventInfo } from '@/entities/message';

export interface NewMessageEvent {
  type: 'message' | 'file';
  data: {
    message_id: EntityId;
    chat_id?: EntityId;
    client_temp_id?: EntityId | null;
    reply_to?: EntityId | null;
    content?: string;
  } & Partial<FileMessageContent>;
  sender_id?: EntityId;
  username: string;
  sender_username?: string;
  avatar_url?: string | null;
  timestamp: string;
  is_deleted?: boolean;
  delivery_error?: string;
  forwarded_from?: ForwardedFrom | null;
  reply_preview?: Message;
  is_system?: boolean;
  system_event?: SystemEventInfo;
  sticker?: MessageSticker;
  reactions?: ReactionInfo[];
  read_by?: ReadReceiptInfo[];
}

export interface EditEvent {
  type: 'edit';
  message_id: EntityId;
  new_content: string | FileMessageContent;
  timestamp?: string;
}

export interface AckEvent {
  type: 'ack';
  message_id: EntityId;
  client_temp_id: EntityId;
  timestamp?: string;
}

export interface DeleteEvent {
  type: 'delete';
  message_id: EntityId;
}

export interface ReactionAddEvent {
  type: 'reaction_add';
  message_id: EntityId;
  user_id: EntityId;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  reaction: string;
}

export interface ReactionRemoveEvent {
  type: 'reaction_remove';
  message_id: EntityId;
  user_id: EntityId;
  reaction: string;
}

interface ReaderFields {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  user_id?: EntityId;
  reader_user_id?: EntityId;
  read_at?: string;
  timestamp?: string;
}

export interface ReadEvent extends ReaderFields {
  type: 'is_read' | 'chat_list_read';
  id?: EntityId;
  message_id?: EntityId;
}

export interface ReadBatchEvent extends ReaderFields {
  type: 'chat_read_batch';
  message_ids?: EntityId[];
}

export interface ErrorEvent {
  type: 'error';
  message?: string;
  message_id?: EntityId;
  operation_error?: boolean;
  code?: string;
}

export interface ChatDeletedEvent {
  type: 'chat_deleted';
  chat_id?: EntityId;
}

export interface PresenceUpdateEvent {
  type: 'presence_update';
  username?: string;
  is_online?: boolean;
  last_seen?: string | null;
}

export interface GroupUpdatedEvent {
  type: 'group_updated';
  group?: { chat_id?: EntityId; participants?: unknown[] };
  removed_username?: string;
}

export interface GroupInviteEvent {
  type: 'group_invite_rejected' | 'group_invite_approved';
  chat_id?: EntityId;
}

// Any event type this client does not handle; keeps the union closed so `switch` narrows properly.
export interface UnknownEvent {
  type: 'unknown';
  rawType: string;
}

export type ServerEvent =
  | AckEvent
  | NewMessageEvent
  | EditEvent
  | DeleteEvent
  | ReactionAddEvent
  | ReactionRemoveEvent
  | ReadEvent
  | ReadBatchEvent
  | ErrorEvent
  | ChatDeletedEvent
  | PresenceUpdateEvent
  | GroupUpdatedEvent
  | GroupInviteEvent
  | UnknownEvent;

const KNOWN_TYPES = new Set<string>([
  'ack',
  'message', 'file', 'edit', 'delete', 'reaction_add', 'reaction_remove', 'is_read', 'chat_list_read',
  'chat_read_batch', 'error', 'chat_deleted', 'presence_update', 'group_updated', 'group_invite_rejected',
  'group_invite_approved',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

// Validates the envelope of a raw socket payload; returns null for anything that is not an event object.
export const parseServerEvent = (raw: unknown): ServerEvent | null => {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null;
  if (!KNOWN_TYPES.has(raw.type)) return { type: 'unknown', rawType: raw.type };
  if (raw.type === 'message' || raw.type === 'file') {
    if (!isRecord(raw.data) || !['string', 'number'].includes(typeof raw.data.message_id) || !isPersistedId(raw.data.message_id as EntityId)) return null;
  }
  return raw as unknown as ServerEvent;
};
