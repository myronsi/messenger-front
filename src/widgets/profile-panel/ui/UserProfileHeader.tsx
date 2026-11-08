import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import { ContactNameHeading } from './ContactNameHeading';
import { getPresenceLabel } from '@/shared/utils/presenceFormatters';

interface UserProfileHeaderProps {
  avatarUrl: string;
  hasCustomAvatar: boolean;
  displayName: string;
  isCurrentUser: boolean;
  isEditingContactName: boolean;
  customNameInput: string;
  setCustomNameInput: (name: string) => void;
  onSaveContactName: () => void;
  onCancelContactNameEdit: () => void;
  onEditContactName: () => void;
  isSavingContactName: boolean;
  accountDisplayName: string;
  isOnline: boolean;
  lastSeen?: string | null;
  onAvatarHistory: () => void;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = (props) => {
  const {
    avatarUrl, hasCustomAvatar, displayName, isOnline, lastSeen, onAvatarHistory,
  } = props;
  return (
        <div className="px-5 pb-3 pt-5 text-center md:pt-4">
          {hasCustomAvatar ? (
            <button
              onClick={onAvatarHistory}
              className="mx-auto block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="View profile picture history"
            >
              <AuthenticatedImage
                src={avatarUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full border border-border object-cover shadow-sm transition-opacity hover:opacity-90 md:h-20 md:w-20"
              />
            </button>
          ) : (
            <AuthenticatedImage
              src={avatarUrl}
              alt={displayName}
              className="mx-auto h-24 w-24 rounded-full border border-border object-cover shadow-sm md:h-20 md:w-20"
            />
          )}
          <ContactNameHeading {...props} />
          <div className="mt-2 inline-flex max-w-full items-center rounded-full bg-muted px-3 py-1 text-sm text-subtle-foreground">
            <span className={`mr-2 h-2 w-2 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className="truncate">{getPresenceLabel(isOnline, lastSeen)}</span>
          </div>
        </div>

  );
};

export default UserProfileHeader;
