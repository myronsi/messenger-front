import { isVideoAttachment } from '../model/videoAttachment';
import MediaTile from './MediaTile';
import ProfileAudioRow from './ProfileAudioRow';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Music, Search } from 'lucide-react';
import type { ChatAudio, ChatPhoto } from '../model/types';
import { useSearchChatMessagesQuery } from '../api/messageApi';
import { getSearchText } from '../model/searchText';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatTime } from '@/shared/utils/dateFormatters';
import { ImageViewer } from '@/shared/ui/image-viewer';



export const normalizeProfileMediaUrl = (mediaUrl: string) => {
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  return resolveMediaUrl(mediaUrl);
};

export interface ProfilePhotoItem {
  id: EntityId;
  url: string;
  thumbnailUrl: string;
  isVideo?: boolean;
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

export const ProfileSearchPanel: React.FC<{
  chatId: EntityId;
  onJumpToMessage: (messageId: EntityId) => void;
  autoFocus?: boolean;
}> = ({ chatId, onJumpToMessage, autoFocus = true }) => {
  const { translations, language } = useLanguage();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim();
  const { data, isFetching, error } = useSearchChatMessagesQuery(
    { chatId, query: normalizedQuery },
    { skip: !isPersistedId(chatId) || normalizedQuery.length === 0 }
  );
  const results = data?.results || [];

  useEffect(() => {
    if (!autoFocus) return;
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(timeoutId);
  }, [autoFocus]);

  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span>{translations.chatSearch || translations.searchMessages || 'Chat search'}</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translations.searchInChat || 'Search in chat'}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border">
        {!normalizedQuery ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">{translations.searchQueryRequired || 'Type to search messages.'}</div>
        ) : error ? (
          <div className="px-3 py-4 text-sm text-destructive">{translations.errorLoadingMessages || 'Error loading messages.'}</div>
        ) : results.length === 0 && !isFetching ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">{translations.noSearchResults || 'No results'}</div>
        ) : (
          results.map((result) => {
            const text = getSearchText(result);
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => onJumpToMessage(result.id)}
                className="flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-accent/60"
              >
                <div className="flex max-w-full items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">{result.sender}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTime(result.timestamp, language)}</span>
                </div>
                <span className="line-clamp-2 text-sm text-muted-foreground">{text}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export const ProfilePhotosPanel: React.FC<{
  photos: ProfilePhotoItem[];
  isLoading?: boolean;
  error?: string | null;
  currentUsername?: string;
  onJumpToMessage?: (messageId: EntityId) => void;
}> = ({ photos, isLoading, error, currentUsername, onJumpToMessage }) => {
  const { translations } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const viewerImages = useMemo(() => photos.map((photo) => {
    const isMine = !!currentUsername && photo.senderUsername?.toLowerCase() === currentUsername.toLowerCase();
    const info = photo.sender
      ? { sender: isMine ? translations.replyFromYou : photo.sender, avatarName: photo.sender, avatarUrl: photo.avatarUrl, sentAt: photo.timestamp }
      : undefined;
    const onShowInChat = onJumpToMessage && isPersistedId(photo.id) ? () => onJumpToMessage(photo.id) : undefined;
    return { url: photo.url, name: photo.name, previewUrl: photo.thumbnailUrl || undefined, isVideo: !!photo.isVideo, info, onShowInChat };
  }), [currentUsername, onJumpToMessage, photos, translations.replyFromYou]);

  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{translations.dmPhotos || 'Media in this chat'}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</div>
      ) : isLoading && photos.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <MediaTile key={String(photo.id) + photo.url} url={photo.url} poster={photo.thumbnailUrl || undefined} name={photo.name}
                isVideo={!!photo.isVideo} badge="sm" className="aspect-square rounded-md" onOpen={() => setOpenIndex(index)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {translations.noDmPhotos || 'No media in this chat yet.'}
        </div>
      )}
      {openIndex !== null && viewerImages.length > 0 && (
        <ImageViewer images={viewerImages} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </section>
  );
};

export const ProfileAudiosPanel: React.FC<{
  audios: ProfileAudioItem[];
  isLoading?: boolean;
  error?: string | null;
  currentUsername?: string;
  onJumpToMessage?: (messageId: EntityId) => void;
}> = ({ audios, isLoading, error, currentUsername, onJumpToMessage }) => {
  const { translations } = useLanguage();
  const [playingId, setPlayingId] = useState<EntityId | null>(null);
  const setPlaying = (id: EntityId | null, endedId?: EntityId) => {
    const ended = endedId == null ? -1 : audios.findIndex((audio) => audio.id === endedId);
    setPlayingId(id === null && ended >= 0 ? audios[ended + 1]?.id ?? null : id);
  };

  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{translations.chatAudios || 'Audios in this chat'}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</div>
      ) : isLoading && audios.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : audios.length > 0 ? (
        <div className="space-y-3">
          {audios.map((audio) => (
            <ProfileAudioRow
              key={audio.id} audio={audio} isPlaying={playingId === audio.id} setPlayingMessageId={setPlaying}
              onShowInChat={onJumpToMessage && isPersistedId(audio.id) ? () => onJumpToMessage(audio.id) : undefined}
              isMine={!!currentUsername && audio.senderUsername?.toLowerCase() === currentUsername.toLowerCase()}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {translations.noChatAudios || 'No audios in this chat yet.'}
        </div>
      )}
    </section>
  );
};
