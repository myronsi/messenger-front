import React, { useMemo } from 'react';
import { ImageViewer } from '@/shared/ui/image-viewer';

interface GroupAvatarViewerProps {
  avatarUrl: string;
  groupName: string;
  onClose: () => void;
}

const GroupAvatarViewer: React.FC<GroupAvatarViewerProps> = ({ avatarUrl, groupName, onClose }) => {
  const images = useMemo(() => {
    const extension = avatarUrl.split('?')[0].split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const safeName = groupName.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'group';
    return [{ url: avatarUrl, name: `${groupName} avatar`, downloadName: `${safeName}-avatar.${extension}` }];
  }, [avatarUrl, groupName]);

  return <ImageViewer images={images} onClose={onClose} />;
};

export default GroupAvatarViewer;
