import type { Schema } from '@/shared/api/contract';
import { toUser } from '@/entities/user';
import { toChatLastMessage } from '@/entities/message/model/fromApi';
import type { ApprovalRequest, GroupChatResponse, GroupRole, OneOnOneChatResponse, RawGroupDetails } from './types';

export type ApiChat = Schema<'Chat'>;
export type ApiGroup = Schema<'Group'>;
export type ApiApprovalRequest = Schema<'ApprovalRequest'>;

export type DirectChatItem = OneOnOneChatResponse['chats'][number];
export type GroupChatItem = GroupChatResponse['groups'][number];

const shownName = (user: Schema<'User'>) => user.contact_name?.trim() || user.display_name;

// toDirectChatItem maps a direct chat of the contract to the item the chat list and the pickers use.
export const toDirectChatItem = (chat: ApiChat): DirectChatItem => ({
  id: chat.id,
  interlocutor_id: chat.peer?.id,
  interlocutor_name: chat.peer?.username ?? chat.name,
  interlocutor_display_name: chat.peer ? shownName(chat.peer) : chat.name,
  interlocutor_is_online: chat.peer?.is_online ?? false,
  interlocutor_last_seen: chat.peer?.last_seen ?? null,
  avatar_url: chat.peer?.avatar_url ?? chat.avatar_url ?? undefined,
  interlocutor_deleted: chat.peer?.is_deleted ?? false,
  last_message: chat.last_message ? toChatLastMessage(chat.last_message) : null,
  unread_count: chat.unread_count,
  first_unread_message_id: null,
  is_pinned: chat.is_pinned,
});

export const toGroupChatItem = (chat: ApiChat): GroupChatItem => ({
  chat_id: chat.id,
  name: chat.name,
  avatar_url: chat.avatar_url ?? undefined,
  last_message: chat.last_message ? toChatLastMessage(chat.last_message) : null,
  unread_count: chat.unread_count,
  first_unread_message_id: null,
  is_pinned: chat.is_pinned,
  my_role: chat.my_role ?? null,
});

const ROLES: GroupRole[] = ['owner', 'admin', 'member'];
// Tolerant client: an unknown role is shown as a member, the least privileged one.
const toRole = (role: string | null | undefined): GroupRole => (ROLES.includes(role as GroupRole) ? role as GroupRole : 'member');

// toGroupDetails maps the contract's Group to the details the group screens use.
export const toGroupDetails = (group: ApiGroup): RawGroupDetails => {
  const owner = group.members.find((member) => member.user.id === group.owner_id);
  return {
    chat_id: group.id,
    name: group.name,
    description: group.description ?? '',
    avatar_url: group.avatar_url ?? undefined,
    owner_id: group.owner_id,
    owner_username: owner?.user.username,
    current_user_role: toRole(group.my_role),
    participants: group.members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      display_name: shownName(member.user),
      avatar_url: member.user.avatar_url ?? undefined,
      role: toRole(member.role),
      is_owner: member.role === 'owner',
      is_admin: member.role === 'admin',
    })),
    // Invitations waiting for an answer are approval requests of the invitees; the contract does not list
    // them with the group.
    pending_invites: [],
  };
};

export const toApprovalRequest = (request: ApiApprovalRequest): ApprovalRequest => ({
  id: request.id,
  type: request.type,
  status: request.status,
  message_text: request.preview ?? undefined,
  created_at: request.created_at,
  requester: toUser(request.requester),
  group: request.type === 'group_invite' ? { chat_id: '', name: request.group_name ?? '' } : null,
});
