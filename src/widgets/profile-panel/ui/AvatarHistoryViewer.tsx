import React, { useMemo } from 'react';
import { useGetUserAvatarHistoryQuery } from '@/entities/user';
import { ImageViewer, type ViewerImage } from '@/shared/ui/image-viewer';
import { buildAvatarList } from '../avatarHistoryList';

interface AvatarHistoryViewerProps {
  username: string;
  displayName: string;
  currentAvatarUrl: string;
  onClose: () => void;
}

const fileExtension = (url: string) => url.split('?')[0].split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';

const AvatarHistoryViewer: React.FC<AvatarHistoryViewerProps> = ({ username, displayName, currentAvatarUrl, onClose }) => {
  const { data } = useGetUserAvatarHistoryQuery(username);

  const images = useMemo<ViewerImage[]>(() => {
    const avatars = buildAvatarList(data?.avatars || [], currentAvatarUrl);
    const urls = avatars.length > 0 ? avatars.map((avatar) => avatar.fullUrl) : [currentAvatarUrl];
    return urls.map((url, index) => ({
      url,
      name: `${displayName} avatar`,
      downloadName: `${username}-avatar-${index + 1}.${fileExtension(url)}`,
    }));
  }, [currentAvatarUrl, data?.avatars, displayName, username]);

  return <ImageViewer images={images} onClose={onClose} />;
};

export default AvatarHistoryViewer;
