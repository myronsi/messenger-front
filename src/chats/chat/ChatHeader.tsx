import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ChatHeaderProps {
  chatName: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
  onDeleteChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ chatName, interlocutorDeleted, onBack, onDeleteChat }) => {
  return (
    <div className="px-6 py-4 border-b border-border flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{interlocutorDeleted ? 'Deleted User' : chatName}</h2>
      </div>
      <button onClick={onDeleteChat} className="text-destructive hover:text-destructive/90 transition-colors">
        Delete Chat
      </button>
    </div>
  );
};

export default ChatHeader;
