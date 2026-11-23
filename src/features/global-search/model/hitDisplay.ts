import type { Chat, GlobalSearchHit } from '@/entities/message';
import type { AppLanguage } from '@/shared/lang/languages';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { selfName } from '@/shared/lib/selfName';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime, isSameDay, parseUtcDate } from '@/shared/utils/dateFormatters';

export interface HitContext {
  chatsById: Map<string, Chat>;
  currentUserId?: string;
  query: string;
  language: AppLanguage;
  translations: Translations;
  onOpen: (hit: GlobalSearchHit) => void;
}

export const hitDate = (timestamp: string, language: AppLanguage) => {
  if (!timestamp) return '';
  const date = parseUtcDate(timestamp);
  const today = new Date();
  if (isSameDay(date, today)) return formatTime(timestamp, language);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return formatDateLabel(date, language, today, yesterday);
};

export const chatTitle = (chat: Chat | undefined, hit: GlobalSearchHit, translations: Translations) => {
  if (!chat) return hit.message.sender;
  if (chat.is_saved) return selfName(chat.display_name || chat.name, translations);
  if (chat.interlocutor_deleted) return translations.deletedUser;
  return chat.display_name || chat.name;
};

export const chatAvatar = (chat: Chat | undefined, hit: GlobalSearchHit) => ({
  src: chat ? chat.avatar_url : resolveMediaUrl(hit.message.avatar_url, DEFAULT_AVATAR),
  fallback: chat?.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR,
});

export const senderLabel = (hit: GlobalSearchHit, context: HitContext) => {
  const own = !!context.currentUserId && String(hit.message.sender_id ?? '') === context.currentUserId;
  if (own) return context.translations.replyFromYou;
  return context.chatsById.get(hit.chatId)?.type === 'group' ? hit.message.sender : '';
};

const MAX_CHAT_ROWS = 6;

export const chatName = (chat: Chat, translations: Translations) =>
  (chat.is_saved ? selfName(chat.display_name || chat.name, translations) : chat.display_name || chat.name);

export const matchingChats = (chats: Chat[], query: string, translations: Translations) => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  return chats.filter((chat) => !chat.is_request && [chatName(chat, translations), chat.name]
    .some((name) => (name || '').toLocaleLowerCase().includes(needle))).slice(0, MAX_CHAT_ROWS);
};
