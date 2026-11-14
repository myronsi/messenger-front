import React from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { EntityId } from '@/shared/api/entityId';
import { useGetCommonGroupsQuery } from '@/entities/user';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';

interface UserProfileInfoPanelProps {
  userId?: EntityId;
  actionError: string | null;
  isCurrentUser: boolean;
  onOpenGroup?: (group: { id: EntityId; name: string; avatarUrl?: string }) => void;
  bio?: string;
}

const UserProfileInfoPanel: React.FC<UserProfileInfoPanelProps> = ({
  userId, actionError, isCurrentUser, onOpenGroup, bio,
}) => {
  const { translations } = useLanguage();
  const groups = useGetCommonGroupsQuery(userId ?? '', { skip: !userId || isCurrentUser }).data ?? [];
  return (
    <div className="min-h-full space-y-4 px-5 py-4 md:py-3">
      {actionError && <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{actionError}</div>}
      {bio && (
        <section data-testid="profile-about">
          <p className="text-sm text-muted-foreground">{translations.profileRework.bio}</p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[17px] leading-6 text-foreground">{bio}</p>
        </section>
      )}
      {groups.length > 0 && (
        <section data-testid="profile-common-groups">
          <p className="text-sm text-muted-foreground">{translations.profileRework.mutualGroups}</p>
          <ul className="-mx-1 mt-1 space-y-0.5">
            {groups.map((group) => (
              <li key={group.id}>
                <button type="button" data-testid="profile-common-group" disabled={!onOpenGroup}
                  onClick={() => onOpenGroup?.({ id: group.id, name: group.name, avatarUrl: group.avatar_url ? resolveMediaUrl(group.avatar_url) : undefined })}
                  className="motion-press flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors enabled:hover:bg-accent">
                  <AuthenticatedImage src={resolveMediaUrl(group.avatar_url, DEFAULT_GROUP_AVATAR)} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{group.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />{group.member_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default UserProfileInfoPanel;
