import type { EntityId } from '@/shared/api/entityId';
import { messageAudioTrack, type AudioTrack, type Message } from '@/entities/message';

export const audioQueueFor = (messages: Message[], id: EntityId, voiceTitle: string) => {
  const index = messages.findIndex((message) => message.id === id);
  const track = index === -1 ? null : messageAudioTrack(messages[index], voiceTitle);
  if (!track) return null;
  const upcoming = messages.slice(index + 1)
    .map((message) => messageAudioTrack(message, voiceTitle))
    .filter((next): next is AudioTrack => next?.kind === track.kind);
  return { track, upcoming };
};
