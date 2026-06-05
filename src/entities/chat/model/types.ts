import type { ChatLastMessage } from '@/entities/message';
import type { User } from '@/entities/user';

export interface ApiChat {
  id: number;
  name?: string;
  type: 'private' | 'group';
  participants: User[];
  lastMessage?: ApiMessage;
  unreadCount?: number;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: number | null;
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessage {
  id: number;
  sender_id?: number;
  content?: string;
  senderId: number;
  chatId: number;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'file';
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  isEdited?: boolean;
  replyTo?: number;
  reactions?: Array<{
    userId: number;
    emoji: string;
  }>;
}

export interface OneOnOneChatResponse {
  chats: Array<{
    id: number;
    interlocutor_name: string;
    interlocutor_display_name?: string;
    interlocutor_is_online?: boolean;
    interlocutor_last_seen?: string | null;
    avatar_url?: string;
    interlocutor_deleted?: boolean;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: number | null;
    is_pinned?: boolean;
  }>;
}

export interface GroupChatResponse {
  groups: Array<{
    chat_id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: number | null;
    is_pinned?: boolean;
  }>;
}
