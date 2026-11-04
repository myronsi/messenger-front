import type { EntityId } from '@/shared/api/entityId';

export interface AudioMetadata {
  duration?: number;
  waveform?: number[];
}

export interface FileMessageContent {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  caption?: string;
  audio_metadata?: AudioMetadata;
  image_width?: number;
  image_height?: number;
  thumbnail_url?: string;
}

export interface ForwardedFrom {
  message_id: EntityId;
  sender_id?: EntityId | null;
  sender_name?: string | null;
  sender_username?: string | null;
}

export interface ChatLastMessage {
  id: EntityId;
  sender_id: EntityId;
  sender_name: string;
  content: string | FileMessageContent;
  type: 'message' | 'file';
  timestamp: string;
  edited_at?: string | null;
  read_by?: ReadReceiptInfo[];
  delivery_error?: string | null;
  forwarded_from?: ForwardedFrom | null;
}

export interface UserMessageMeta {
  user_id: EntityId;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface ReactionInfo extends UserMessageMeta {
  reaction: string;
}

export interface ReadReceiptInfo extends UserMessageMeta {
  read_at: string;
}

export interface Message {
  id: EntityId;
  client_temp_id?: EntityId | null;
  local_object_url?: string | null;
  upload_status?: 'uploading' | 'failed';
  upload_progress?: number;
  sender_id?: EntityId;
  is_own?: boolean;
  is_live?: boolean;
  sender: string;
  sender_username?: string | null;
  content: string | FileMessageContent;
  timestamp: string;
  avatar_url?: string;
  reply_to?: EntityId | null;
  reply_preview?: Message;
  is_system?: boolean;
  is_deleted?: boolean;
  is_deleting?: boolean;
  edited_at?: string | null;
  type: 'message' | 'file';
  delivery_error?: string;
  forwarded_from?: ForwardedFrom | null;
  reactions?: ReactionInfo[];
  read_by: ReadReceiptInfo[];
}

export interface MessageSelection {
  ids: ReadonlySet<EntityId>;
  active: boolean;
  closing: boolean;
  toggle: (message: Message, extend?: boolean) => void;
  start: (message: Message) => void;
}

export interface ChatPhoto {
  id: EntityId;
  file_url?: string;
  url?: string;
  file_name?: string;
  name?: string;
  file_type?: string;
  file_size?: number;
  image_width?: number;
  image_height?: number;
  thumbnail_url?: string;
  timestamp: string;
}

export interface ChatPhotosResponse {
  photos: ChatPhoto[];
}

export interface ChatAudio {
  id: EntityId;
  file_url?: string;
  url?: string;
  file_name?: string;
  name?: string;
  file_type?: string;
  file_size?: number;
  audio_metadata?: AudioMetadata;
  audio_kind: 'voice' | 'file';
  timestamp: string;
}

export interface ChatAudiosResponse {
  audios: ChatAudio[];
}

export interface ChatSearchResult {
  id: EntityId;
  sender_id?: EntityId;
  sender: string;
  sender_username?: string | null;
  avatar_url?: string | null;
  content: Message['content'];
  type: Message['type'];
  forwarded_from?: ForwardedFrom | null;
  timestamp: string;
}

export interface ForwardMessagesResponse {
  forwarded: Array<{ chat_id: EntityId; message_id: EntityId }>;
  failed: Array<{ chat_id: EntityId; reason: string }>;
}

export interface ChatSearchResponse {
  results: ChatSearchResult[];
}

export interface Chat {
  id: EntityId;
  name: string;
  interlocutor_name: string;
  display_name?: string;
  avatar_url: string;
  is_online?: boolean;
  last_seen?: string | null;
  interlocutor_deleted: boolean;
  type: 'one-on-one' | 'group';
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: EntityId | null;
  is_pinned?: boolean;
  pending_approval_request?: boolean;
  pending_request_id?: EntityId;
}

export interface ContextMenuState {
  x: number;
  y: number;
  messageId: EntityId;
  isMine: boolean;
  openLeft?: boolean;
  isClosing?: boolean;
}

export interface ModalState {
  type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
  message?: string;
  consequences?: string[];
  onConfirm?: () => void;
}
