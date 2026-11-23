import type { EntityId } from '@/shared/api/entityId';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { Drawing } from '@/shared/ui/drawing';
import type { AudioTrack } from './audioPlayer';
import type { ChatAudio, ChatPhoto } from './types';
import { isVideoAttachment } from './videoAttachment';

export const normalizeProfileMediaUrl = (mediaUrl: string) => {
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  return resolveMediaUrl(mediaUrl);
};

export interface ProfilePhotoItem {
  id: EntityId;
  url: string;
  thumbnailUrl: string;
  isVideo?: boolean;
  drawing?: Drawing | null;
  aspect?: number;
  name: string;
  timestamp: string;
  sender?: string;
  senderUsername?: string | null;
  avatarUrl?: string;
}

export interface ProfileAudioItem {
  id: EntityId;
  url: string;
  name: string;
  kind: 'voice' | 'file';
  timestamp: string;
  duration?: number;
  waveform?: number[];
  sender?: string;
  senderUsername?: string | null;
}

export const toProfilePhotos = (photos: ChatPhoto[] = [], fallbackName: string): ProfilePhotoItem[] => (
  photos
    .map((photo) => {
      const url = photo.file_url || photo.url || '';
      const name = photo.file_name || photo.name || fallbackName;
      const isVideo = isVideoAttachment({ file_name: name, file_type: photo.file_type || '', file_url: url, file_size: photo.file_size ?? 0 });
      return {
        id: photo.id,
        url: url ? normalizeProfileMediaUrl(url) : '',
        thumbnailUrl: photo.thumbnail_url ? normalizeProfileMediaUrl(photo.thumbnail_url) : (url && !isVideo ? normalizeProfileMediaUrl(url) : ''),
        isVideo,
        drawing: photo.drawing,
        aspect: photo.image_width && photo.image_height ? photo.image_width / photo.image_height : undefined,
        name,
        timestamp: photo.timestamp,
        sender: photo.sender,
        senderUsername: photo.sender_username,
        avatarUrl: photo.avatar_url,
      };
    })
    .filter((photo) => !!photo.url)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
);

export const profileAudioTrack = (audio: ProfileAudioItem, voiceTitle: string): AudioTrack => ({
  id: audio.id,
  src: audio.url,
  title: audio.kind === 'voice' ? [audio.sender, voiceTitle].filter(Boolean).join(' · ') : audio.name.replace(/\.[^.]+$/, '') || audio.name,
  kind: audio.kind === 'voice' ? 'voice' : 'music',
  duration: audio.duration,
  origin: audio.kind === 'voice' ? undefined : audio.sender || undefined,
});

export const toProfileAudios = (audios: ChatAudio[] = [], fallbackName: string): ProfileAudioItem[] => (
  audios
    .map((audio) => {
      const url = audio.file_url || audio.url || '';
      return {
        id: audio.id,
        url: url ? normalizeProfileMediaUrl(url) : '',
        name: audio.file_name || audio.name || fallbackName,
        kind: audio.audio_kind,
        timestamp: audio.timestamp,
        duration: audio.audio_metadata?.duration,
        waveform: audio.audio_metadata?.waveform,
        sender: audio.sender,
        senderUsername: audio.sender_username,
      };
    })
    .filter((audio) => !!audio.url)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
);
