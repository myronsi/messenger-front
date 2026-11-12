import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { ProfileAudiosPanel, ProfileFilesPanel, ProfilePhotosPanel, ProfileAudioItem, ProfilePhotoItem, type ChatFile } from '@/entities/message';
import type { ProfilePanelView } from './UserProfilePanelContent';

interface UserProfilePanelViewProps {
  view: ProfilePanelView;
  canShowPhotos: boolean;
  canShowAudios: boolean;
  canShowFiles?: boolean;
  files?: ChatFile[];
  isLoadingFiles?: boolean;
  filesError?: string | null;
  photos: ProfilePhotoItem[];
  audios: ProfileAudioItem[];
  isLoadingPhotos: boolean;
  isLoadingAudios: boolean;
  photosError: string | null;
  currentUsername?: string;
  onJumpToMessage?: (messageId: EntityId) => void;
  audiosError: string | null;
  infoPanel: React.ReactNode;
}

const UserProfilePanelView: React.FC<UserProfilePanelViewProps> = ({
  view, canShowPhotos, canShowAudios, canShowFiles = false, files = [], isLoadingFiles = false, filesError = null,
  photos, audios, isLoadingPhotos, isLoadingAudios, photosError, audiosError, infoPanel, currentUsername, onJumpToMessage,
}) => {
  if (view === 'photos' && canShowPhotos) return <ProfilePhotosPanel photos={photos} isLoading={isLoadingPhotos} error={photosError} currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} />;
  if (view === 'audios' && canShowAudios) return <ProfileAudiosPanel currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} audios={audios} isLoading={isLoadingAudios} error={audiosError} />;
  if (view === 'files' && canShowFiles) {
    return <ProfileFilesPanel files={files} isLoading={isLoadingFiles} error={filesError}
      currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} />;
  }
  return <>{infoPanel}</>;
};

export default UserProfilePanelView;
