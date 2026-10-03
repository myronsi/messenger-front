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
    pending_approval_request?: boolean;
    pending_request_id?: number;
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

export interface ApprovalRequestGroup {
  chat_id: number;
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface ApprovalRequest {
  id: number;
  type: 'direct_message' | 'group_invite';
  status: 'pending' | 'approved' | 'rejected';
  message_text?: string;
  created_at?: string | null;
  responded_at?: string | null;
  requester: User | null;
  group?: ApprovalRequestGroup | null;
}

export interface ApprovalRequestInboxResponse {
  requests: ApprovalRequest[];
  unread_count: number;
}

export interface CreateChatResponse {
  chat_id?: number;
  message: string;
  approval_required?: boolean;
  already_pending?: boolean;
  request_id?: number;
}

export interface MarkChatReadRequest {
  chatId: number;
  messageIds?: number[];
  markAll?: boolean;
}

export interface MarkChatReadResponse {
  chat_id: number;
  unread_count: number;
  first_unread_message_id: number | null;
  read_message_ids: number[];
  read_at: string;
}

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface RawGroupParticipant {
  id: number; username: string; display_name?: string; avatar_url?: string; role?: GroupRole;
  is_owner?: boolean; is_admin?: boolean;
}
export interface RawGroupPendingInvite { request_id: number; id: number; username: string; display_name?: string; avatar_url?: string; }
export interface RawGroupDetails {
  chat_id: number; name?: string; description?: string; avatar_url?: string; owner_id?: number;
  owner_username?: string; admin_id?: number; admin_username?: string; current_user_role?: GroupRole;
  participants?: RawGroupParticipant[]; pending_invites?: RawGroupPendingInvite[];
}
