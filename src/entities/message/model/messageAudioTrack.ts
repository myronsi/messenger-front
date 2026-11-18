import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { AudioTrack } from './audioPlayer';
import type { Message } from './types';
import { isAudioAttachment, isVoiceAttachment } from './videoAttachment';

const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, '');

export const messageAudioTrack = (message: Message, voiceTitle: string): AudioTrack | null => {
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
  };
};
