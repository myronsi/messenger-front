import React from 'react';
import { MessageSquare, Menu, Search } from 'lucide-react';

interface ChatsListHeaderProps {
  translations: any;
  onOpenProfile: () => void;
  // parent wants the button bounding rect so it can animate from that point
  onOpenSearch: (rect: DOMRect) => void;
}

const ChatsListHeader: React.FC<ChatsListHeaderProps> = ({ translations, onOpenProfile, onOpenSearch }) => {
  const searchBtnRef = React.useRef<HTMLButtonElement | null>(null);

  const handleOpen = () => {
    if (searchBtnRef.current) {
      const rect = searchBtnRef.current.getBoundingClientRect();
      onOpenSearch(rect);
    } else {
      // fallback: call with an empty rect
      onOpenSearch(new DOMRect());
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="w-6 h-6" />
        {translations.chats}
      </h2>
      <div className="flex items-center gap-2">
        <button
          ref={searchBtnRef}
          onClick={handleOpen}
          aria-label="Open search"
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
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
