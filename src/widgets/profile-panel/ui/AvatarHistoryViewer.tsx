import React, { useMemo } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useGetUserAvatarHistoryQuery } from '@/entities/user';
import { ImageViewer, type ViewerImage } from '@/shared/ui/image-viewer';
import { buildAvatarList } from '../avatarHistoryList';

interface AvatarHistoryViewerProps {
  username: string;
  displayName: string;
  currentAvatarUrl: string;
  onClose: () => void;
  onDeleteAvatar?: (id: EntityId) => Promise<void>;
  initialIndex?: number;
}

const fileExtension = (url: string) => url.split('?')[0].split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';

const AvatarHistoryViewer: React.FC<AvatarHistoryViewerProps> = ({ username, displayName, currentAvatarUrl, onClose, onDeleteAvatar, initialIndex = 0 }) => {
  const { data } = useGetUserAvatarHistoryQuery(username);

  const images = useMemo<ViewerImage[]>(() => {
    const avatars = buildAvatarList(data?.avatars || [], currentAvatarUrl);
    const list = avatars.length > 0 ? avatars : [{ id: 0, fullUrl: currentAvatarUrl }];
    return list.map(({ id, fullUrl: url }, index) => ({
      url,
      thumbnailSource: currentAvatarUrl,
      name: `${displayName} avatar`,
      downloadName: `${username}-avatar-${index + 1}.${fileExtension(url)}`,
      onDelete: onDeleteAvatar && id ? () => onDeleteAvatar(id) : undefined,
    }));
  }, [currentAvatarUrl, data?.avatars, displayName, onDeleteAvatar, username]);

  return <ImageViewer images={images} initialIndex={initialIndex} onClose={onClose} />;
};

export default AvatarHistoryViewer;
