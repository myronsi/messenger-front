import React from 'react';
import { MessageSquare, Menu, Search } from 'lucide-react';

interface ChatsListHeaderProps {
  translations: any;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
}

const ChatsListHeader: React.FC<ChatsListHeaderProps> = ({ translations, onOpenProfile, onOpenSearch }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="w-6 h-6" />
        {translations.chats}
      </h2>
      <div className="flex items-center gap-2">
        <button onClick={onOpenSearch} className="p-2 hover:bg-accent rounded-full transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button onClick={onOpenProfile} className="p-2 hover:bg-accent rounded-full transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatsListHeader;
