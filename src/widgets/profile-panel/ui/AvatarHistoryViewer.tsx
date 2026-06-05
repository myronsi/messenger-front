import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageOff, Loader2, X } from 'lucide-react';
import { useGetUserAvatarHistoryQuery } from '@/app/api/messengerApi';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};

const isDefaultAvatar = (avatarUrl?: string | null) => getAvatarUrl(avatarUrl) === DEFAULT_AVATAR;

interface AvatarHistoryViewerProps {
  username: string;
  displayName: string;
  currentAvatarUrl: string;
  onClose: () => void;
}

const AvatarHistoryViewer: React.FC<AvatarHistoryViewerProps> = ({
  username,
  displayName,
  currentAvatarUrl,
  onClose,
}) => {
  const { translations } = useLanguage();
  const { data, isLoading, isError } = useGetUserAvatarHistoryQuery(username);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const swipeStartXRef = useRef<number | null>(null);

  const avatars = useMemo(() => {
    const history = data?.avatars || [];
    const normalizedHistory = history
      .map((avatar) => ({
        ...avatar,
        fullUrl: getAvatarUrl(avatar.avatar_url),
      }))
      .filter((avatar) => !isDefaultAvatar(avatar.avatar_url));
    const currentExists = normalizedHistory.some((avatar) => avatar.fullUrl === currentAvatarUrl);

    if (isDefaultAvatar(currentAvatarUrl)) return normalizedHistory;

    return currentExists
      ? normalizedHistory
      : [
          {
            id: 0,
            avatar_url: currentAvatarUrl,
            created_at: '',
            is_current: true,
            fullUrl: currentAvatarUrl,
          },
          ...normalizedHistory,
        ];
  }, [currentAvatarUrl, data?.avatars]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [avatars.length, username]);

  const selectedAvatar = avatars[selectedIndex];
  const selectedUrl = selectedAvatar?.fullUrl || '';
  const selectedBroken = brokenImages[selectedUrl];
  const canMove = avatars.length > 1;

  const showPrevious = useCallback(() => {
    if (!canMove) return;
    setSelectedIndex((index) => (index - 1 + avatars.length) % avatars.length);
  }, [avatars.length, canMove]);

  const showNext = useCallback(() => {
    if (!canMove) return;
    setSelectedIndex((index) => (index + 1) % avatars.length);
  }, [avatars.length, canMove]);

  const handleDownload = useCallback(async () => {
    if (!selectedUrl) return;
    const extension = selectedUrl.split('?')[0].split('.').pop() || 'jpg';
    const filename = `${username}-avatar-${selectedIndex + 1}.${extension}`;

    try {
      const response = await fetch(selectedUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');
      link.href = selectedUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [selectedIndex, selectedUrl, username]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showNext, showPrevious]);

  return (
    <div
      className="motion-avatar-viewer-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 py-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {!isLoading && selectedUrl && (
          <button
            onClick={handleDownload}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={translations.download || 'Download'}
            title={translations.download || 'Download'}
          >
            <Download className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close avatar viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="motion-panel-in relative flex max-h-full w-full max-w-3xl flex-col items-center">
        {avatars.length > 1 && (
          <div className="mb-4 text-center text-xs text-white/50">
            {selectedIndex + 1} / {avatars.length}
          </div>
        )}

        <div
          className="relative flex min-h-[280px] w-full items-center justify-center rounded-lg bg-black/30 p-4"
          onPointerDown={(event) => {
            swipeStartXRef.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const startX = swipeStartXRef.current;
            swipeStartXRef.current = null;
            if (startX === null) return;
            const deltaX = event.clientX - startX;
            if (Math.abs(deltaX) < 50) return;
            if (deltaX > 0) showPrevious();
            else showNext();
          }}
          onPointerCancel={() => {
            swipeStartXRef.current = null;
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{translations.loading}</span>
            </div>
          ) : !selectedUrl || isError ? (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">{translations.noPreviousAvatars || 'No avatar history'}</span>
            </div>
          ) : selectedBroken ? (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">{translations.failedToLoadImage || 'Failed to load image'}</span>
            </div>
          ) : (
            <img
              key={selectedUrl}
              src={selectedUrl}
              alt={`${displayName} avatar`}
              className="motion-avatar-viewer-image max-h-[68vh] max-w-full rounded-lg object-contain"
              onError={() => setBrokenImages((images) => ({ ...images, [selectedUrl]: true }))}
            />
          )}

          {canMove && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="group absolute inset-y-0 left-0 flex w-1/3 items-center justify-start rounded-l-lg bg-gradient-to-r from-black/35 via-black/10 to-transparent bg-[length:45%_100%] bg-left bg-no-repeat px-3 text-white transition-colors hover:from-black/50 focus:outline-none focus-visible:outline-none"
                aria-label={translations.previous || 'Previous'}
              >
                <ChevronLeft className="h-8 w-8 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]" />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="group absolute inset-y-0 right-0 flex w-1/3 items-center justify-end rounded-r-lg bg-gradient-to-l from-black/35 via-black/10 to-transparent bg-[length:45%_100%] bg-right bg-no-repeat px-3 text-white transition-colors hover:from-black/50 focus:outline-none focus-visible:outline-none"
                aria-label={translations.next || 'Next'}
              >
                <ChevronRight className="h-8 w-8 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarHistoryViewer;
