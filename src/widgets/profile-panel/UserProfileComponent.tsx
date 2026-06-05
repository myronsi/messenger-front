import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import AvatarHistoryViewer from './ui/AvatarHistoryViewer';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserProfileComponentProps {
  username: string;
  onClose: () => void;
  // onDeleteChat: () => void; // Пропс для функции удаления чата
}

const UserProfileComponent: React.FC<UserProfileComponentProps> = ({ username, onClose }) => {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState(username);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);
  const { translations } = useLanguage();

  const getAvatarUrl = (value?: string | null) => {
    if (!value) return DEFAULT_AVATAR;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `${BASE_URL}${value}`;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/users/users/${username}`);
        if (response.ok) {
          const data = await response.json();
          if (data.is_deleted) {
            setIsDeleted(true);
          } else {
            setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
            setBio(data.bio || '');
            setDisplayName(data.display_name || data.username || username);
            setIsOnline(!!data.is_online);
            setLastSeen(data.last_seen || null);
          }
        } else if (response.status === 404) {
          setIsDeleted(true);
        } else {
          throw new Error(`HTTP ${translations.error}: ${response.status}`);
        }
      } catch (err) {
        console.error(`${translations.errorLoading}:`, err);
        setIsDeleted(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, [username, translations]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">{translations.loading}</div>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="w-full h-full relative p-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-4">{translations.userProfile}</h3>
        <p className="text-muted-foreground">{translations.accountDeletedOrUnavailable}</p>
      </div>
    );
  }

  const fullAvatarUrl = getAvatarUrl(avatarUrl);
  const hasCustomAvatar = fullAvatarUrl !== DEFAULT_AVATAR;

  return (
    <div className="w-full h-full relative p-4 flex flex-col">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex-grow space-y-4">
        {hasCustomAvatar ? (
          <button
            onClick={() => setIsAvatarViewerOpen(true)}
            className="block w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="View profile picture history"
          >
            <img
              src={fullAvatarUrl}
              alt={username}
              className="w-full h-auto rounded-lg object-cover transition-opacity hover:opacity-90"
            />
          </button>
        ) : (
          <img
            src={fullAvatarUrl}
            alt={username}
            className="w-full h-auto rounded-lg object-cover"
          />
        )}
        {username && (
          <div className="mt-2">
            <h3 className="text-2xl font-bold break-words">{displayName}</h3>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <p className="text-sm text-muted-foreground">{getPresenceLabel(isOnline, lastSeen)}</p>
          </div>
        )}
        {bio && (
          <div className="mt-2 flex items-center gap-2">
            <Info className="w-7 h-7 text-muted-foreground mr-3" />
            <div>
              <p className="text-muted-foreground text-sm">{translations.bio}</p>
              <p className="text-lg">{bio}</p>
            </div>
          </div>
        )}
      </div>
      {isAvatarViewerOpen && hasCustomAvatar && (
        <AvatarHistoryViewer
          username={username}
          displayName={displayName}
          currentAvatarUrl={fullAvatarUrl}
          onClose={() => setIsAvatarViewerOpen(false)}
        />
      )}
      {/* Кнопка "Удалить чат" внизу */}
      {/* <button
        onClick={onDeleteChat}
        className="mt-4 p-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
      >
        {translations.deleteChat}
      </button> */}
    </div>
  );
};

export default UserProfileComponent;
