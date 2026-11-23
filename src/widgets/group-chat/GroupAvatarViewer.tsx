import React, { useMemo } from 'react';
import { ImageViewer } from '@/shared/ui/image-viewer';
import { trimChars } from '@/shared/lib/trimChars';

interface GroupAvatarViewerProps {
  avatarUrl: string;
  groupName: string;
  onClose: () => void;
}

const GroupAvatarViewer: React.FC<GroupAvatarViewerProps> = ({ avatarUrl, groupName, onClose }) => {
  const images = useMemo(() => {
    const extension = avatarUrl.split('?')[0].split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const safeName = trimChars(groupName.trim().replace(/[^a-z0-9_-]+/gi, '-'), '-') || 'group';
    return [{ url: avatarUrl, name: `${groupName} avatar`, downloadName: `${safeName}-avatar.${extension}` }];
  }, [avatarUrl, groupName]);

  return <ImageViewer images={images} onClose={onClose} />;
};

export default GroupAvatarViewer;
