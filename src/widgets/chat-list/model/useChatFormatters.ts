import type { EntityId } from '@/shared/api/entityId';
import { systemEventText, type ChatLastMessage } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime, parseUtcDate } from '@/shared/utils/dateFormatters';

export const isContentLabel = (lastMessage?: ChatLastMessage | null) => {
  if (!lastMessage || lastMessage.system_event || lastMessage.delivery_error) return false;
  if (lastMessage.sticker) return true;
  if (typeof lastMessage.content === 'string') return false;
  const fileName = lastMessage.content.file_name || '';
  if (lastMessage.content.file_type === 'voice' || /\.opus$/i.test(fileName)) return true;
  return !lastMessage.content.caption?.trim();
};

// Pure presentational helpers for rendering a chat's last-message preview/time
// and whether the current user authored/has read it.
export function useChatFormatters(currentUserId?: EntityId) {
  const { translations, language } = useLanguage();

  const getLastMessagePreview = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage) return translations.noMessagesYet;
    if (lastMessage.system_event) return systemEventText(lastMessage.system_event, translations, (id) => !!id && id === currentUserId);
    if (lastMessage.type === 'file' && typeof lastMessage.content !== 'string') {
      const fileType = lastMessage.content.file_type;
      const fileName = lastMessage.content.file_name || '';
      const caption = lastMessage.content.caption?.trim();
      if (fileType === 'voice' || /\.opus$/i.test(fileName)) return translations.voiceMessagePreview;
      if (caption) return caption;
      if (fileType === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) return translations.photoMessage;
      return translations.fileMessagePreview;
    }
    if (lastMessage.delivery_error) return lastMessage.delivery_error;
    if (lastMessage.sticker) return `${lastMessage.sticker.emoji} ${translations.sticker}`;
    return typeof lastMessage.content === 'string' ? lastMessage.content : translations.fileMessagePreview;
  };

  const getLastMessageTime = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage?.timestamp) return '';
    const messageDate = parseUtcDate(lastMessage.timestamp);
    const today = new Date();
    if (messageDate.toDateString() === today.toDateString() || messageDate > today) return formatTime(lastMessage.timestamp, language);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(messageDate, language, today, yesterday);
  };

  const isOwnLastMessage = (lastMessage?: ChatLastMessage | null) => {
    return !!currentUserId && lastMessage?.sender_id === currentUserId;
  };

  const isOwnLastMessageRead = (lastMessage?: ChatLastMessage | null) => {
    if (!currentUserId || !lastMessage?.read_by) return false;
    return lastMessage.read_by.some((read) => read.user_id !== currentUserId);
  };

  return {
    translations,
    language,
    getLastMessagePreview,
    getLastMessageTime,
    isOwnLastMessage,
    isOwnLastMessageRead,
  };
}
