import React from 'react';
import { ProfileAudiosPanel, ProfilePhotosPanel, ProfileSearchPanel, ProfileAudioItem, ProfilePhotoItem } from '@/entities/message';
import type { ProfilePanelView } from './UserProfilePanelContent';
import type { Id } from '@/shared/lib/ids';

interface UserProfilePanelViewProps {
  view: ProfilePanelView;
  autoFocusSearch: boolean;
  canShowSearch: boolean;
  canShowPhotos: boolean;
  canShowAudios: boolean;
  chatId?: Id;
  onJumpToMessage?: (messageId: Id) => void;
  photos: ProfilePhotoItem[];
  audios: ProfileAudioItem[];
  isLoadingPhotos: boolean;
  isLoadingAudios: boolean;
  photosError: string | null;
  audiosError: string | null;
  infoPanel: React.ReactNode;
}

const UserProfilePanelView: React.FC<UserProfilePanelViewProps> = ({
  view, autoFocusSearch, canShowSearch, canShowPhotos, canShowAudios, chatId, onJumpToMessage,
  photos, audios, isLoadingPhotos, isLoadingAudios, photosError, audiosError, infoPanel,
}) => {
  if (view === 'search' && canShowSearch && chatId && onJumpToMessage) {
    return <ProfileSearchPanel chatId={chatId} onJumpToMessage={onJumpToMessage} autoFocus={autoFocusSearch} />;
  }
  if (view === 'photos' && canShowPhotos) return <ProfilePhotosPanel photos={photos} isLoading={isLoadingPhotos} error={photosError} />;
  if (view === 'audios' && canShowAudios) return <ProfileAudiosPanel audios={audios} isLoading={isLoadingAudios} error={audiosError} />;
  return <>{infoPanel}</>;
};

export default UserProfilePanelView;
