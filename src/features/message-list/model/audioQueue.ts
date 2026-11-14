import type { EntityId } from '@/shared/api/entityId';
import { isAudioAttachment, isVoiceAttachment, type AudioTrack, type Message } from '@/entities/message';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export const messageAudioTrack = (message: Message, voiceTitle: string): AudioTrack | null => {
  const content = message.content;
  if (message.type !== 'file' || typeof content === 'string' || !content?.file_url || message.is_deleted) return null;
  if (!isAudioAttachment(content)) return null;
  const voice = isVoiceAttachment(content);
  return {
    id: message.id,
    src: resolveMediaUrl(content.file_url),
    title: voice ? [message.sender, voiceTitle].filter(Boolean).join(' · ') : content.file_name,
    kind: voice ? 'voice' : 'music',
    duration: content.audio_metadata?.duration,
  };
};

export const audioQueueFor = (messages: Message[], id: EntityId, voiceTitle: string) => {
  const index = messages.findIndex((message) => message.id === id);
  const track = index === -1 ? null : messageAudioTrack(messages[index], voiceTitle);
  if (!track) return null;
  const upcoming = messages.slice(index + 1)
    .map((message) => messageAudioTrack(message, voiceTitle))
    .filter((next): next is AudioTrack => next?.kind === track.kind);
  return { track, upcoming };
};
