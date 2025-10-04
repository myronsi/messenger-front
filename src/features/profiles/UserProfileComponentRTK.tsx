import React from 'react';
import { X, AtSign, Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useGetUserByUsernameQuery } from '@/app/api/messengerApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserProfileComponentRTKProps {
  username: string;
  onClose: () => void;
}

const UserProfileComponentRTK: React.FC<UserProfileComponentRTKProps> = ({ 
  username, 
  onClose 
}) => {
  const { translations } = useLanguage();
  
  // Use username-based query instead of user ID
  const { 
    data: userData, 
    error, 
    isLoading 
  } = useGetUserByUsernameQuery(username);

  if (isLoading) {
    return (
      <div className="w-full h-full relative p-4 bg-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{translations.loading}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="w-full h-full relative p-4 bg-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{translations.userProfile}</h3>
          <p className="text-gray-500">{translations.accountDeletedOrUnavailable}</p>
        </div>
      </div>
    );
  }

  const avatarUrl = userData.avatar_url 
    ? `${BASE_URL}${userData.avatar_url}` 
    : DEFAULT_AVATAR;

  return (
    <div className="w-full h-full relative p-4 flex flex-col bg-white">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>
      
      <div className="flex-grow space-y-6">
        {/* Avatar with full width and auto height */}
        <div className="w-full">
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-auto rounded-lg object-cover shadow-sm border border-gray-200"
          />
        </div>
        
        {/* User Information */}
        <div className="space-y-4">
          {/* Username */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <AtSign className="w-6 h-6 text-gray-500 flex-shrink-0" />
            <div className="flex-grow">
              <p className="text-sm text-gray-500 mb-1">{translations.userName}</p>
              <p className="text-lg font-medium text-gray-900">@{username}</p>
            </div>
          </div>
          
          {/* Bio if available */}
          {userData.bio && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Info className="w-6 h-6 text-gray-500 flex-shrink-0" />
              <div className="flex-grow">
                <p className="text-sm text-gray-500 mb-1">Bio</p>
                <p className="text-lg font-medium text-gray-900">{userData.bio}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileComponentRTK;