import type { Message } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';

const IMAGE_NAME = /\.(jpg|jpeg|png|gif|webp|avif|heic)$/i;

export const pinSnippet = (message: Message, translations: Translations) => {
  if (message.sticker) return `${message.sticker.emoji} ${translations.sticker}`;
  if (typeof message.content === 'string') return message.content.replace(/\s+/g, ' ').trim();
  const { caption, file_type: fileType = '', file_name: fileName = '', kind } = message.content;
  if (fileType === 'voice' || kind === 'voice') return translations.voiceMessage;
  if (caption) return caption.replace(/\s+/g, ' ').trim();
  if (kind === 'image' || fileType.startsWith('image/') || IMAGE_NAME.test(fileName)) return translations.photoMessage;
  if (kind === 'video' || fileType.startsWith('video/')) return translations.video;
  return fileName || translations.fileMessagePreview;
};
