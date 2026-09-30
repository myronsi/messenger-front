import type { ChatLastMessage } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatTime, parseUtcDate } from '@/shared/utils/dateFormatters';

// Pure presentational helpers for rendering a chat's last-message preview/time
// and whether the current user authored/has read it.
export function useChatFormatters(currentUserId?: number) {
  const { translations, language } = useLanguage();

  const getLastMessagePreview = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage) return translations.noMessagesYet;
    const withEditedLabel = (preview: string) => (
      lastMessage.edited_at ? `${translations.edited}: ${preview}` : preview
    );

    if (lastMessage.type === 'file' && typeof lastMessage.content !== 'string') {
      const fileType = lastMessage.content.file_type;
      const fileName = lastMessage.content.file_name || '';
      if (fileType === 'voice' || /\.opus$/i.test(fileName)) return withEditedLabel(translations.voiceMessagePreview);
      if (fileType === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) return withEditedLabel(translations.photoMessage);
      return withEditedLabel(translations.fileMessagePreview);
    }
    if (lastMessage.delivery_error) return lastMessage.delivery_error;
    return withEditedLabel(typeof lastMessage.content === 'string' ? lastMessage.content : translations.fileMessagePreview);
  };

  const getLastMessageTime = (lastMessage?: ChatLastMessage | null) => {
    if (!lastMessage?.timestamp) return '';
    const messageDate = parseUtcDate(lastMessage.timestamp);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const messageDayStart = new Date(messageDate);
    messageDayStart.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((todayStart.getTime() - messageDayStart.getTime()) / (24 * 60 * 60 * 1000));
    const locale = language === 'ru' ? 'ru-RU' : 'en-GB';

    if (dayDiff <= 0) {
      return formatTime(lastMessage.timestamp, language);
    }

    if (dayDiff === 1) {
      return translations.yesterday || (language === 'ru' ? 'Вчера' : 'Yesterday');
    }

    if (dayDiff < 7) {
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(messageDate).toLowerCase();
    }

    if (messageDate.getFullYear() === todayStart.getFullYear()) {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(messageDate);
    }

    const day = String(messageDate.getDate()).padStart(2, '0');
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${messageDate.getFullYear()}`;
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
