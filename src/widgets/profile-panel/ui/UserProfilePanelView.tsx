import React from 'react';
import { ProfileAudiosPanel, ProfilePhotosPanel, ProfileAudioItem, ProfilePhotoItem } from '@/entities/message';
import type { ProfilePanelView } from './UserProfilePanelContent';

interface UserProfilePanelViewProps {
  view: ProfilePanelView;
  canShowPhotos: boolean;
  canShowAudios: boolean;
  photos: ProfilePhotoItem[];
  audios: ProfileAudioItem[];
  isLoadingPhotos: boolean;
  isLoadingAudios: boolean;
  photosError: string | null;
  audiosError: string | null;
  infoPanel: React.ReactNode;
}

const UserProfilePanelView: React.FC<UserProfilePanelViewProps> = ({
  view, canShowPhotos, canShowAudios,
  photos, audios, isLoadingPhotos, isLoadingAudios, photosError, audiosError, infoPanel,
}) => {
  if (view === 'photos' && canShowPhotos) return <ProfilePhotosPanel photos={photos} isLoading={isLoadingPhotos} error={photosError} />;
  if (view === 'audios' && canShowAudios) return <ProfileAudiosPanel audios={audios} isLoading={isLoadingAudios} error={audiosError} />;
  return <>{infoPanel}</>;
};

export default UserProfilePanelView;
