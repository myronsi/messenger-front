import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { useEffect, useState } from 'react';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useSearchUsersQuery } from '@/entities/user';


interface SearchUsersProps {
  currentUsername: string;
  onCreated?: () => void;
  onClose?: () => void;
  translations: Translations;
  onOpenPreview?: (username: string) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ currentUsername, translations, onOpenPreview }) => {
  const [targetUser, setTargetUser] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(targetUser.trim()), 300);
    return () => clearTimeout(t);
  }, [targetUser]);

  const { data: searchData } = useSearchUsersQuery(debouncedSearch, { skip: !debouncedSearch || debouncedSearch.length < 2 });

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 w-full">
        <div className="flex-grow min-w-0 relative">
          <input
            type="text"
            placeholder={translations.searchUsers}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-ellipsis"
          />

          {debouncedSearch && searchData?.users && searchData.users.length > 0 && (
            <div className="mt-3">
              <div className="bg-white border border-border rounded-md max-h-72 overflow-auto">
                {searchData.users.map((u) => {
                  const isSelf = u.username?.toLowerCase() === currentUsername?.toLowerCase();
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (isSelf) return;
                        if (onOpenPreview) onOpenPreview(u.username);
                      }}
                      role="button"
                      tabIndex={isSelf ? -1 : 0}
                      aria-disabled={isSelf}
                      className={`flex items-center p-3 rounded-lg transition-all ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'}`}
                    >
                      <img
                        src={resolveMediaUrl(u.avatar_url, DEFAULT_AVATAR)}
                        alt={u.username}
                        className={`w-10 h-10 rounded-full mr-3 object-cover ${isSelf ? 'opacity-50' : ''}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{u.username}</div>
                      </div>
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchUsers;
