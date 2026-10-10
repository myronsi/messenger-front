import type { ChatLastMessage } from '@/entities/message';
import type { User } from '@/entities/user';
import type { Id } from '@/shared/lib/ids';

export interface OneOnOneChatResponse {
  chats: Array<{
    id: Id;
    interlocutor_id?: Id;
    interlocutor_name: string;
    interlocutor_display_name?: string;
    interlocutor_is_online?: boolean;
    interlocutor_last_seen?: string | null;
    avatar_url?: string;
    interlocutor_deleted?: boolean;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: Id | null;
    is_pinned?: boolean;
    pending_approval_request?: boolean;
    pending_request_id?: Id;
  }>;
}

export interface GroupChatResponse {
  groups: Array<{
    chat_id: Id;
    name: string;
    description?: string;
    avatar_url?: string;
    last_message?: ChatLastMessage | null;
    unread_count?: number;
    first_unread_message_id?: Id | null;
    is_pinned?: boolean;
    my_role?: GroupRole | null;
  }>;
}

export interface ApprovalRequestGroup {
  chat_id: Id;
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface ApprovalRequest {
  id: Id;
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
  chat_id?: Id;
  message: string;
  approval_required?: boolean;
  already_pending?: boolean;
  request_id?: Id;
}

export interface MarkChatReadRequest {
  chatId: Id;
  messageIds?: Id[];
  // The chat's newest message, to mark everything read.
  lastMessageId?: Id | null;
}

export interface MarkChatReadResponse {
  chat_id: Id;
  unread_count: number;
  first_unread_message_id: Id | null;
  read_message_ids: Id[];
  read_at: string;
}

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface RawGroupParticipant {
  id: Id; username: string; display_name?: string; avatar_url?: string; role?: GroupRole;
  is_owner?: boolean; is_admin?: boolean;
}
export interface RawGroupPendingInvite { request_id: Id; id: Id; username: string; display_name?: string; avatar_url?: string; }
export interface RawGroupDetails {
  chat_id: Id; name?: string; description?: string; avatar_url?: string; owner_id?: Id;
  owner_username?: string; admin_id?: Id; admin_username?: string; current_user_role?: GroupRole;
  participants?: RawGroupParticipant[]; pending_invites?: RawGroupPendingInvite[];
}
