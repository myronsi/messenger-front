import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
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
  const query = targetUser.trim().replace(/^@/, '');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { currentData: searchData, isError, isFetching } = useSearchUsersQuery(debouncedSearch, { skip: !debouncedSearch || debouncedSearch.length < 2 });

  const settled = query === debouncedSearch && query.length >= 2 && !isFetching;

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

          {settled && (isError || searchData?.users.length === 0) && (
            <p role="status" className="mt-3 px-3 py-2 text-sm text-muted-foreground">
              {isError ? translations.appShell.peopleSearchFailed : translations.appShell.noPeopleFound}
            </p>
          )}
          {query === debouncedSearch && !!searchData?.users.length && (
            <div className="mt-3">
              <div className="bg-card border border-border rounded-md max-h-72 overflow-auto">
                {searchData.users.map((u) => {
                  const isSelf = u.username?.toLowerCase() === currentUsername?.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        if (isSelf) return;
                        if (onOpenPreview) onOpenPreview(u.username);
                      }}
                      data-testid="user-search-result"
                      data-username={u.username}
                      disabled={isSelf}
                      className={`flex w-full items-center p-3 text-left rounded-lg transition-all ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'}`}
                    >
                      <AuthenticatedImage
                        src={resolveMediaUrl(u.avatar_url, DEFAULT_AVATAR)}
                        alt=""
                        className={`w-10 h-10 rounded-full mr-3 object-cover ${isSelf ? 'opacity-50' : ''}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{u.display_name || u.username}</div>
                        <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                      </div>
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </button>
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
