import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { AudioTrack } from './audioPlayer';
import type { EntityId } from '@/shared/api/entityId';
import type { Message, MessageAttachment } from './types';
import { isAudioAttachment, isVoiceAttachment } from './videoAttachment';

const ATTACHMENT_PATH = /\/attachments\/([^/?#]+)\/content/;

export const attachmentIdFromUrl = (url?: string | null) => (url ? ATTACHMENT_PATH.exec(url)?.[1] : undefined);

const attachmentIdOf = (content: MessageAttachment) => content.attachment_id || attachmentIdFromUrl(content.file_url);

const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, '');

export const messageAudioTrack = (message: Message, voiceTitle: string, chatId?: EntityId): AudioTrack | null => {
  const content = message.content;
  if (message.type !== 'file' || typeof content === 'string' || !content?.file_url || message.is_deleted) return null;
  if (!isAudioAttachment(content)) return null;
  const voice = isVoiceAttachment(content);
  return {
    id: message.id,
    src: resolveMediaUrl(content.file_url),
    title: voice ? [message.sender, voiceTitle].filter(Boolean).join(' · ') : content.audio_title || withoutExtension(content.file_name) || content.file_name,
    artist: voice ? undefined : content.audio_artist || undefined,
    kind: voice ? 'voice' : 'music',
    duration: content.audio_metadata?.duration,
    cover: content.thumbnail_url || undefined,
    origin: voice ? undefined : message.sender || undefined,
    ...(attachmentIdOf(content) ? { attachmentId: attachmentIdOf(content) } : {}),
    ...(chatId !== undefined ? { chatId } : {}),
  };
};
