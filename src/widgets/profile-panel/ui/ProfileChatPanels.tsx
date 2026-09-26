import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Music, Search } from 'lucide-react';
import type { ChatAudio, ChatPhoto, ChatSearchResult } from '@/entities/message';
import { useSearchChatMessagesQuery } from '@/app/api/messengerApi';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatTime } from '@/shared/utils/dateFormatters';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const normalizeProfileMediaUrl = (mediaUrl: string) => {
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  return `${BASE_URL}${mediaUrl}`;
};

export interface ProfilePhotoItem {
  id: number;
  url: string;
  name: string;
  timestamp: string;
}

export interface ProfileAudioItem {
  id: number;
  url: string;
  name: string;
  kind: 'voice' | 'file';
  timestamp: string;
}

export const toProfilePhotos = (photos: ChatPhoto[] = [], fallbackName: string): ProfilePhotoItem[] => (
  photos
    .map((photo) => {
      const url = photo.file_url || photo.url || '';
      return {
        id: photo.id,
        url: url ? normalizeProfileMediaUrl(url) : '',
        name: photo.file_name || photo.name || fallbackName,
        timestamp: photo.timestamp,
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
      };
    })
    .filter((audio) => !!audio.url)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
);

const getSearchText = (result: ChatSearchResult) => {
  if (typeof result.content === 'string') return result.content;
  return result.content?.file_name || '';
};

export const ProfileSearchPanel: React.FC<{
  chatId: number;
  onJumpToMessage: (messageId: number) => void;
  autoFocus?: boolean;
}> = ({ chatId, onJumpToMessage, autoFocus = true }) => {
  const { translations, language } = useLanguage();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim();
  const { data, isFetching, error } = useSearchChatMessagesQuery(
    { chatId, query: normalizedQuery },
    { skip: chatId <= 0 || normalizedQuery.length === 0 }
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
    <section className="border-b border-gray-200 px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Search className="h-4 w-4 text-gray-500" />
        <span>{translations.chatSearch || translations.searchMessages || 'Chat search'}</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translations.searchInChat || 'Search in chat'}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-gray-200">
        {!normalizedQuery ? (
          <div className="px-3 py-4 text-sm text-gray-500">{translations.searchQueryRequired || 'Type to search messages.'}</div>
        ) : error ? (
          <div className="px-3 py-4 text-sm text-red-600">{translations.errorLoadingMessages || 'Error loading messages.'}</div>
        ) : results.length === 0 && !isFetching ? (
          <div className="px-3 py-4 text-sm text-gray-500">{translations.noSearchResults || 'No results'}</div>
        ) : (
          results.map((result) => {
            const text = getSearchText(result);
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => onJumpToMessage(result.id)}
                className="flex w-full flex-col gap-1 border-b border-gray-200 px-3 py-3 text-left last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex max-w-full items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-gray-900">{result.sender}</span>
                  <span className="shrink-0 text-xs text-gray-500">{formatTime(result.timestamp, language)}</span>
                </div>
                <span className="line-clamp-2 text-sm text-gray-500">{text}</span>
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
}> = ({ photos, isLoading, error }) => {
  const { translations } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<ProfilePhotoItem | null>(null);

  useEffect(() => {
    setSelectedPhoto((currentPhoto) => (
      currentPhoto && photos.some((photo) => photo.id === currentPhoto.id) ? currentPhoto : null
    ));
  }, [photos]);

  return (
    <section className="border-b border-gray-200 px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800">
          <ImageIcon className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">{translations.dmPhotos || 'Photos in this chat'}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : isLoading && photos.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-md bg-gray-100" />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-3">
          {selectedPhoto && (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              <img src={selectedPhoto.url} alt={selectedPhoto.name} className="max-h-72 w-full bg-gray-100 object-contain" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className={`group block aspect-square overflow-hidden rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selectedPhoto?.id === photo.id ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                title={photo.name}
              >
                <img src={photo.url} alt={photo.name} loading="lazy" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          {translations.noDmPhotos || 'No photos in this chat yet.'}
        </div>
      )}
    </section>
  );
};

export const ProfileAudiosPanel: React.FC<{
  audios: ProfileAudioItem[];
  isLoading?: boolean;
  error?: string | null;
}> = ({ audios, isLoading, error }) => {
  const { translations } = useLanguage();

  return (
    <section className="border-b border-gray-200 px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800">
          <Music className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">{translations.chatAudios || 'Audios in this chat'}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : isLoading && audios.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-gray-100" />
          ))}
        </div>
      ) : audios.length > 0 ? (
        <div className="space-y-2">
          {audios.map((audio) => (
            <div key={audio.id} className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">{audio.name}</div>
                  <div className="text-xs text-gray-500">
                    {audio.kind === 'voice'
                      ? translations.voiceMessagePreview || 'Voice message'
                      : translations.audioFile || 'Audio file'}
                  </div>
                </div>
              </div>
              <audio controls preload="metadata" src={audio.url} className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          {translations.noChatAudios || 'No audios in this chat yet.'}
        </div>
      )}
    </section>
  );
};
