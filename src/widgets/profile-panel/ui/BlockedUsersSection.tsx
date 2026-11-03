import React from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { User } from '@/entities/user';

export interface BlockedUsersSectionProps {
  blockedUsers: Array<Pick<User, 'username' | 'display_name'>>;
  handleUnblockUser: (username: string) => void;
  isUnblockingUser: boolean;
}

const BlockedUsersSection: React.FC<BlockedUsersSectionProps> = ({ blockedUsers, handleUnblockUser, isUnblockingUser }) => {
  const { translations } = useLanguage();
  return (
    <section>
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.blockedUsers || 'Blocked users'}</p>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {blockedUsers.length ? blockedUsers.map((blockedUser) => (
          <div key={blockedUser.username} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{blockedUser.display_name || blockedUser.username}</span>
              <span className="block truncate text-xs text-muted-foreground">@{blockedUser.username}</span>
            </span>
            <button
              type="button"
              onClick={() => handleUnblockUser(blockedUser.username)}
              disabled={isUnblockingUser}
              className="shrink-0 text-sm font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {translations.unblock || 'Unblock'}
            </button>
          </div>
        )) : (
          <div className="px-4 py-3 text-sm text-muted-foreground">{translations.noBlockedUsers || 'No blocked users'}</div>
        )}
      </div>
    </section>
  );
};

export default BlockedUsersSection;
