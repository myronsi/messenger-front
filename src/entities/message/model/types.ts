import type { EntityId } from '@/shared/api/entityId';
import type { Drawing } from '@/shared/ui/drawing';
import type { components } from '@/shared/api/generated/schema';
import type { ImportSummaryInfo, MessageImportInfo } from './importTypes';
import type { GroupChangeFields, RichFields } from './richTypes';

export interface AudioMetadata {
  duration?: number;
  waveform?: number[];
}

export type AttachmentKind = 'image' | 'audio' | 'voice' | 'video' | 'file';

export interface MessageAttachment {
  attachment_id?: string;
  kind?: AttachmentKind;
  drawing?: Drawing | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  audio_metadata?: AudioMetadata;
  image_width?: number;
  image_height?: number;
  thumbnail_url?: string;
  display_url?: string;
  placeholder?: string;
  processing?: MediaProcessing;
  source_url?: string;
  animation_url?: string;
  audio_title?: string;
  audio_artist?: string;
  audio_album?: string;
}

export type MediaProcessing = 'queued' | 'running' | 'done' | 'failed';

export interface FileMessageContent extends MessageAttachment {
  caption?: string;
  album?: MessageAttachment[];
}

export interface MessageSticker {
  id?: EntityId;
  pack_id?: EntityId;
  pack_slug?: string;
  emoji: string;
  image_url?: string;
  panel_url?: string;
  message_url?: string;
  is_animated?: boolean;
}

export interface ForwardedFrom {
  message_id: EntityId;
  sender_id?: EntityId | null;
  sender_name?: string | null;
  sender_username?: string | null;
}

export type SystemEventKind = components['schemas']['SystemEventKind'];

export interface CallSummaryInfo {
  call_id: EntityId;
  kind: 'direct' | 'group';
  outcome: 'completed' | 'missed' | 'declined' | 'cancelled' | 'failed';
  duration_seconds: number | null;
}

export interface SystemEventInfo extends GroupChangeFields {
  kind: SystemEventKind;
  actor_id?: EntityId | null;
  actor_name: string;
  target_id?: EntityId;
  target_name?: string;
  call?: CallSummaryInfo;
  message_id?: EntityId;
  snippet?: string;
  message_type?: components['schemas']['MessageType'];
  import?: ImportSummaryInfo;
  text?: string;
}

export interface ChatLastMessage extends RichFields {
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
  system_event?: SystemEventInfo;
  sticker?: MessageSticker;
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

export interface ModerationRemovalReason {
  code: string;
  text: string;
}

export interface Message extends RichFields {
  id: EntityId;
  client_temp_id?: EntityId | null;
  server_kept?: boolean;
  is_cached?: boolean;
  local_object_url?: string | null;
  upload_status?: 'uploading' | 'failed' | 'lost';
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
  system_event?: SystemEventInfo;
  is_deleted?: boolean;
  is_deleting?: boolean;
  removed_by_moderation?: boolean;
  moderation_reason?: ModerationRemovalReason | null;
  edited_at?: string | null;
  type: 'message' | 'file';
  sticker?: MessageSticker;
  delivery_error?: string;
  forwarded_from?: ForwardedFrom | null;
  reactions?: ReactionInfo[];
  read_by: ReadReceiptInfo[];
  mentions?: EntityId[];
  mentions_all?: boolean;
  import?: MessageImportInfo | null;
}

export interface MessageSelection {
  ids: ReadonlySet<EntityId>;
  active: boolean;
  closing: boolean;
  toggle: (message: Message, extend?: boolean) => void;
  start: (message: Message) => void;
  beginDrag?: (message: Message) => void;
  dragTo?: (message: Message) => void;
}

export interface ChatPhoto extends Pick<FileMessageContent, 'album' | 'display_url' | 'kind'> {
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
  drawing?: Drawing | null;
  sender?: string;
  sender_username?: string | null;
  avatar_url?: string;
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
  sender?: string;
  sender_username?: string | null;
  timestamp: string;
}

export interface ChatAudiosResponse {
  audios: ChatAudio[];
}

export interface ChatFile {
  id: EntityId;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  caption?: string;
  sender?: string;
  sender_username?: string | null;
  timestamp: string;
}

export interface ChatFilesResponse {
  files: ChatFile[];
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
  interlocutor_id?: EntityId;
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
  unread_mentions_count?: number;
  first_unread_message_id?: EntityId | null;
  is_pinned?: boolean;
  pin_position?: number | null;
  is_archived?: boolean;
  is_request?: boolean;
  is_saved?: boolean;
  my_role?: string | null;
  pending_approval_request?: boolean;
  pending_request_id?: EntityId;
  pinned_message_count?: number;
}

export type PinScope = 'me' | 'everyone';

export interface PinnedMessage {
  message: Message;
  scope: PinScope;
  pinned_by: EntityId;
  pinned_at: string;
  can_unpin_for_everyone: boolean;
}

export interface PinnedMessages {
  items: PinnedMessage[];
  next_cursor: string | null;
  count: number | null;
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
