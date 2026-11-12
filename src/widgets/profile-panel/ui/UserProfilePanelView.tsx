import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { ProfileAudiosPanel, ProfileFilesPanel, ProfileLinksPanel, ProfilePhotosPanel, ProfileAudioItem, ProfilePhotoItem, type ChatFile, type ChatLinkItem } from '@/entities/message';
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
  links?: ChatLinkItem[];
  isLoadingLinks?: boolean;
  voice?: ProfileAudioItem[];
}

const UserProfilePanelView: React.FC<UserProfilePanelViewProps> = ({
  view, canShowPhotos, canShowAudios, canShowFiles = false, files = [], isLoadingFiles = false, filesError = null,
  photos, audios, isLoadingPhotos, isLoadingAudios, photosError, audiosError, infoPanel, currentUsername, onJumpToMessage,
  links = [], isLoadingLinks = false, voice = [],
}) => {
  if (view === 'links') return <ProfileLinksPanel links={links} isLoading={isLoadingLinks} onJumpToMessage={onJumpToMessage} />;
  if (view === 'voice') return <ProfileAudiosPanel currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} audios={voice} isLoading={isLoadingAudios} error={audiosError} />;
  if (view === 'photos' && canShowPhotos) return <ProfilePhotosPanel photos={photos} isLoading={isLoadingPhotos} error={photosError} currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} />;
  if (view === 'audios' && canShowAudios) return <ProfileAudiosPanel currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} audios={audios} isLoading={isLoadingAudios} error={audiosError} />;
  if (view === 'files' && canShowFiles) {
    return <ProfileFilesPanel files={files} isLoading={isLoadingFiles} error={filesError}
      currentUsername={currentUsername} onJumpToMessage={onJumpToMessage} />;
  }
  return <>{infoPanel}</>;
};

export default UserProfilePanelView;
