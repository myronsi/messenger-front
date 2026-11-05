import type { EntityId } from '@/shared/api/entityId';
import type { ChatLastMessage } from '@/entities/message';
import type { User } from '@/entities/user';

export interface ApiChat {
  id: EntityId;
  name?: string;
  type: 'private' | 'group';
  participants: User[];
  lastMessage?: ApiMessage;
  unreadCount?: number;
  last_message?: ChatLastMessage | null;
  unread_count?: number;
  first_unread_message_id?: EntityId | null;
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessage {
  id: EntityId;
  sender_id?: EntityId;
  content?: string;
  senderId: EntityId;
  chatId: EntityId;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'file';
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  isEdited?: boolean;
  replyTo?: EntityId;
  reactions?: Array<{
    userId: EntityId;
    emoji: string;
  }>;
}

export interface OneOnOneChatResponse {
  chats: Array<{
    id: EntityId;
    interlocutor_name: string;
    interlocutor_display_name?: string;
    interlocutor_is_online?: boolean;
    interlocutor_last_seen?: string | null;
    avatar_url?: string;
    interlocutor_deleted?: boolean;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: EntityId | null;
    is_pinned?: boolean;
    pending_approval_request?: boolean;
    pending_request_id?: EntityId;
  }>;
}

export interface GroupChatResponse {
  groups: Array<{
    chat_id: EntityId;
    name: string;
    description?: string;
    avatar_url?: string;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: EntityId | null;
    is_pinned?: boolean;
  }>;
}

export interface ApprovalRequestGroup {
  chat_id: EntityId;
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface ApprovalRequest {
  id: EntityId;
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
  chat_id?: EntityId;
  message: string;
  approval_required?: boolean;
  already_pending?: boolean;
  request_id?: EntityId;
}

export interface MarkChatReadRequest {
  chatId: EntityId;
  messageIds?: EntityId[];
  markAll?: boolean;
}

export interface MarkChatReadResponse {
  chat_id: EntityId;
  unread_count: number;
  first_unread_message_id: EntityId | null;
  read_message_ids: EntityId[];
  read_at: string;
}

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface RawGroupParticipant {
  id: EntityId; username: string; display_name?: string; avatar_url?: string; role?: GroupRole;
  is_owner?: boolean; is_admin?: boolean;
}
export interface RawGroupPendingInvite { request_id: EntityId; id: EntityId; username: string; display_name?: string; avatar_url?: string; }
export interface RawGroupDetails {
  chat_id: EntityId; name?: string; description?: string; avatar_url?: string; owner_id?: EntityId;
  owner_username?: string; admin_id?: EntityId; admin_username?: string; current_user_role?: GroupRole;
  participants?: RawGroupParticipant[]; pending_invites?: RawGroupPendingInvite[];
}
export interface GroupRoleLogUser { id: EntityId; username: string; display_name: string }
export interface GroupRoleEvent { id: EntityId; actor: GroupRoleLogUser | null; target: GroupRoleLogUser; role: GroupRole; created_at: string }
export interface GroupRoleLog { items: GroupRoleEvent[] }
