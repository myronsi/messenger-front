import React, { useState, useEffect } from 'react';
import { X, AtSign, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/base/ui';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserProfileComponentProps {
  username: string;
  onClose: () => void;
  // onDeleteChat: () => void; // Пропс для функции удаления чата
}

const UserProfileComponent: React.FC<UserProfileComponentProps> = ({ username, onClose }) => {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [bio, setBio] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { translations } = useLanguage();

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

  return (
    <div className="w-full h-full relative p-4 flex flex-col">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex-grow space-y-4">
        {/* Аватарка во всю ширину с автоматической высотой */}
        <img
          src={`${BASE_URL}${avatarUrl}`}
          alt={username}
          className="w-full h-auto rounded-lg object-cover"
        />
        {/* Имя пользователя */}
        {username && (
          <div className="mt-2 flex items-center gap-2">
            <AtSign className="w-7 h-7 text-muted-foreground mr-3" />
            <div>
              <p className="text-muted-foreground text-sm">{translations.userName}</p>
              <p className="text-lg">@{username}</p>
            </div>
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
