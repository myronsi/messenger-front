import { authFetch } from '@/shared/auth/session';

export const notificationReturnPath = (pathname: string, search: string) => (
  /^\/chat\/[1-9]\d*$/.test(pathname) && new URLSearchParams(search).get('notification') === '1'
    ? `${pathname}?notification=1` : '/'
);

export async function resolveNotificationChat(id: string) {
  const response = await authFetch(`${import.meta.env.VITE_BASE_URL}/chats/${encodeURIComponent(id)}`);
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
