
export interface Message {
  id: number;
  sender: string;
  content: string | { file_url: string; file_name: string; file_type: string; file_size: number };
  timestamp: string;
  avatar_url?: string;
  reply_to?: number | null;
  is_deleted?: boolean;
  type: 'message' | 'file';
  reactions?: { user_id: number; reaction: string }[];
  read_by: { user_id: number; read_at: string }[];
}

export interface Chat {
  id: number;
  name: string;
  interlocutor_name: string;
  avatar_url: string;
  interlocutor_deleted: boolean;
  type: 'one-on-one' | 'group';
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
