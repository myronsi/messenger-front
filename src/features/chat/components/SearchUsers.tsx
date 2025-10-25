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
}

const SearchUsers: React.FC<SearchUsersProps> = ({ currentUsername, onCreated, onClose, translations }) => {
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
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-2 w-full">
        <div className="flex-grow min-w-0 relative">
          <input
            type="text"
            placeholder={translations.username}
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateChat()}
            className="w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-ellipsis"
          />

          {debouncedSearch && searchData?.users && searchData.users.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-md z-50 max-h-52 overflow-auto">
              {searchData.users.map((u: any) => (
                <li
                  key={u.id}
                  onClick={() => handleCreateChat(u.username)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer"
                >
                  <img src={u.avatar_url ? `${BASE_URL}${u.avatar_url}` : DEFAULT_AVATAR} alt={u.username} className="w-6 h-6 rounded-full object-cover" />
                  <span className="truncate">{u.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => handleCreateChat()}
          disabled={isCreating}
          className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default SearchUsers;
