import type { EntityId } from '@/shared/api/entityId';
export const dmPath = (username: string) => `/dm/@${encodeURIComponent(username.replace(/^@/, ''))}`;
export const dmChatPath = (chatId: EntityId) => `/dm/${chatId}`;

export const directChatPath = (chatId: EntityId, username: string, interlocutorDeleted?: boolean) => (
  interlocutorDeleted ? dmChatPath(chatId) : dmPath(username)
);

export const parseDmIdentifier = (pathname: string) => {
  const match = pathname.match(/^\/(?:dm|direct)\/([^/]+)$/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]).trim();
  const normalized = decoded.replace(/^@/, '');
  if (/^\d+$/.test(normalized)) {
    return { type: 'chatId' as const, value: normalized };
  }
  return { type: 'username' as const, value: normalized };
};

export const parseProfileUsername = (pathname: string) => {
  const match = pathname.match(/^\/@([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]).trim();
};

export interface CurrentChat {
  id: EntityId;
  name: string;
  displayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string;
  interlocutorDeleted: boolean;
  type: 'one-on-one' | 'group';
  firstUnreadMessageId?: EntityId | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
  pendingApprovalRequest?: boolean;
  pendingApprovalMessage?: string;
  previewKey?: string;
}

export const chatPanelKey = (chat: CurrentChat) => chat.previewKey ?? `${chat.type}-${chat.id}-${chat.name}`;
