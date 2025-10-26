import React, { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useSearchUsersQuery, useCreateChatMutation } from '@/app/api/messengerApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface SearchUsersProps {
  currentUsername: string;
  onCreated?: () => void;
  onClose?: () => void;
  translations: any;
  onOpenPreview?: (username: string) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ currentUsername, onCreated, onClose, translations, onOpenPreview }) => {
  const [targetUser, setTargetUser] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createChat, { isLoading: isCreating }] = useCreateChatMutation();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(targetUser.trim()), 300);
    return () => clearTimeout(t);
  }, [targetUser]);

  const { data: searchData } = useSearchUsersQuery(debouncedSearch, { skip: !debouncedSearch || debouncedSearch.length < 2 });

  const handleCreateChat = async (usernameTo?: string) => {
    const user2 = usernameTo || targetUser.trim();
    if (!user2) return;
    try {
      await createChat({ user1: currentUsername, user2 }).unwrap();
      setTargetUser('');
      if (onCreated) onCreated();
      if (onClose) onClose();
    } catch (e) {
      console.error('Failed to create chat:', e);
    }
  };

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 w-full">
        <div className="flex-grow min-w-0 relative">
          <input
            type="text"
            placeholder={translations.searchDots}
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-ellipsis"
          />

          {debouncedSearch && searchData?.users && searchData.users.length > 0 && (
            <div className="mt-3">
              <div className="bg-white border border-border rounded-md max-h-72 overflow-auto">
                {searchData.users.map((u: any) => {
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
                        src={u.avatar_url ? `${BASE_URL}${u.avatar_url}` : DEFAULT_AVATAR}
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
