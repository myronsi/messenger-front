import React, { useCallback, useEffect, useState } from 'react';
import { Download, ImageOff, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';

interface GroupAvatarViewerProps {
  avatarUrl: string;
  groupName: string;
  onClose: () => void;
}

const GroupAvatarViewer: React.FC<GroupAvatarViewerProps> = ({ avatarUrl, groupName, onClose }) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const [isBroken, setIsBroken] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!avatarUrl || isBroken) return;
    const extension = avatarUrl.split('?')[0].split('.').pop() || 'jpg';
    const safeName = groupName.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'group';
    const filename = `${safeName}-avatar.${extension}`;

    try {
      const response = await fetch(avatarUrl, { credentials: 'include' });
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
      link.href = avatarUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [avatarUrl, groupName, isBroken]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="motion-avatar-viewer-backdrop absolute inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {!isBroken && (
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={translations.download || 'Download'}
            title={translations.download || 'Download'}
          >
            <Download className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close avatar viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="motion-panel-in relative flex max-h-full w-full flex-col items-center">
        <div className="relative flex min-h-[260px] w-full items-center justify-center rounded-lg bg-black/30 p-4">
          {isBroken ? (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">{translations.failedToLoadImage || 'Failed to load image'}</span>
            </div>
          ) : (
            <img
              src={avatarUrl}
              alt={`${groupName} avatar`}
              className="motion-avatar-viewer-image max-h-[62vh] max-w-full rounded-lg object-contain"
              onError={() => setIsBroken(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};


export default GroupAvatarViewer;
