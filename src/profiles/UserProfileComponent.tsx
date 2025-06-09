
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/base/ui';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserProfileComponentProps {
  username: string;
  onClose: () => void;
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
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border">
          <div className="text-center text-muted-foreground">{translations.loading}</div>
        </div>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold mb-4">{translations.userProfile}</h3>
          <p className="text-muted-foreground">{translations.accountDeletedOrUnavailable}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{translations.userProfile}</h3>
          
          <div className="flex items-center space-x-4">
            <img
              src={`${BASE_URL}${avatarUrl}`}
              alt={username}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h4 className="font-medium">{username}</h4>
              <p className="text-muted-foreground">{bio || translations.noBio}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileComponent;
