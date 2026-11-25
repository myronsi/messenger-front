import type { EntityId } from '@/shared/api/entityId';
import type { ImportSenderState, ImportSourceName } from '@/entities/message';

export type { ImportSenderState, ImportSourceName };

export type ChatImportState = 'running' | 'done' | 'removing';

export interface ChatImportSender {
  key: string;
  name: string;
  message_count: number;
  state: ImportSenderState;
  user_id: EntityId | null;
}

export interface ChatImport {
  id: EntityId;
  chat_id: EntityId;
  source: ImportSourceName;
  state: ChatImportState;
  message_count: number;
  file_count: number;
  first_at: string;
  last_at: string;
  next_index: number;
  imported_by: EntityId | null;
  created_at: string;
  finished_at: string | null;
  senders: ChatImportSender[];
}

export interface ChatImportList {
  items: ChatImport[];
}

export type SenderAssignment = 'me' | EntityId | null;

export interface StartImportSender {
  key: string;
  name: string;
  message_count: number;
  me?: boolean;
  user_id?: EntityId;
}

export interface StartImportRequest {
  source: ImportSourceName;
  message_count: number;
  file_count: number;
  first_at: string;
  last_at: string;
  senders: StartImportSender[];
}

export type ImportedMessageType = 'text' | 'file' | 'voice' | 'note';

export interface ImportedMessage {
  index: number;
  sender_key?: string;
  original_at: string;
  type: ImportedMessageType;
  content?: string | null;
  attachment_ids?: EntityId[];
  reply_to_index?: number;
}

export interface AddImportMessagesRequest {
  from_index: number;
  messages: ImportedMessage[];
}

export interface AddImportMessagesResponse {
  next_index: number;
}

export type SenderDecision = 'confirm' | 'decline' | 'withdraw';

export interface ImportUpdateEvent {
  type: 'import_update';
  chat_id: EntityId;
  data: { import_id: EntityId; state: ChatImportState };
}

export interface ImportSenderUpdateEvent {
  type: 'import_sender_update';
  chat_id: EntityId;
  data: { import_id: EntityId; sender: ChatImportSender };
}

export type ImportServerEvent = ImportUpdateEvent | ImportSenderUpdateEvent;
