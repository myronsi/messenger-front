import { getApiBaseUrl } from '@/shared/api/config';
import { authFetch } from '@/shared/auth/session';

export { notificationReturnPath } from '@/shared/lib/notifications/navigation';

export async function resolveNotificationChat(id: string) {
  const response = await authFetch(`${getApiBaseUrl()}/chats/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Conversation unavailable');
  const chat = await response.json();
  return {
    chatId: id,
    chatName: chat.type === 'group' ? chat.name || id : chat.peer?.username || chat.participants?.[0]?.username || id,
    chatDisplayName: chat.name || chat.peer?.display_name || chat.participants?.[0]?.display_name || id,
    type: chat.type === 'group' ? 'group' as const : 'one-on-one' as const,
    interlocutorDeleted: Boolean(chat.peer?.is_deleted),
  };
}
