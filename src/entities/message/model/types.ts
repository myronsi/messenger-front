
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
}

export interface ForwardedFrom {
  message_id: number;
  sender_id?: number | null;
  sender_name?: string | null;
  sender_username?: string | null;
}

export interface ChatLastMessage {
  id: number;
  sender_id: number;
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
  user_id: number;
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
  id: number;
  client_temp_id?: number | null;
  local_object_url?: string | null;
  upload_status?: 'uploading' | 'failed';
  upload_progress?: number;
  sender_id?: number;
  is_own?: boolean;
  sender: string;
  sender_username?: string | null;
  content: string | FileMessageContent;
  timestamp: string;
  avatar_url?: string;
  reply_to?: number | null;
  is_deleted?: boolean;
  deleted_for?: number[];
  is_deleting?: boolean;
  edited_at?: string | null;
  type: 'message' | 'file';
  delivery_error?: string;
  forwarded_from?: ForwardedFrom | null;
  reactions?: ReactionInfo[];
  read_by: ReadReceiptInfo[];
}

export interface ChatPhoto {
  id: number;
  file_url?: string;
  url?: string;
  file_name?: string;
  name?: string;
  file_type?: string;
  file_size?: number;
  timestamp: string;
}

export interface ChatPhotosResponse {
  photos: ChatPhoto[];
}

export interface ChatAudio {
  id: number;
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
  id: number;
  sender_id?: number;
  sender: string;
  sender_username?: string | null;
  avatar_url?: string | null;
  content: Message['content'];
  type: Message['type'];
  forwarded_from?: ForwardedFrom | null;
  timestamp: string;
}

export interface ForwardMessagesResponse {
  forwarded: Array<{ chat_id: number; message_id: number }>;
  failed: Array<{ chat_id: number; reason: string }>;
}

export interface ChatSearchResponse {
  results: ChatSearchResult[];
}

export interface Chat {
  id: number;
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
  first_unread_message_id?: number | null;
  is_pinned?: boolean;
  pending_approval_request?: boolean;
  pending_request_id?: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  messageId: number;
  isMine: boolean;
  isClosing?: boolean;
}

export interface ModalState {
  type: 'deleteMessage' | 'deleteChat' | 'error' | 'copy' | 'deletedUser';
  message: string;
  onConfirm?: () => void;
}
