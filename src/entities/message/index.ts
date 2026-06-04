
export interface ChatLastMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string | { file_url: string; file_name: string; file_type: string; file_size: number };
  type: 'message' | 'file';
  timestamp: string;
  read_by?: ReadReceiptInfo[];
  delivery_error?: string | null;
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
  sender_id?: number;
  sender: string;
  sender_username?: string | null;
  content: string | { file_url: string; file_name: string; file_type: string; file_size: number };
  timestamp: string;
  avatar_url?: string;
  reply_to?: number | null;
  is_deleted?: boolean;
  edited_at?: string | null;
  type: 'message' | 'file';
  delivery_error?: string;
  reactions?: ReactionInfo[];
  read_by: ReadReceiptInfo[];
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
