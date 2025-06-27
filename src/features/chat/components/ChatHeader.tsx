import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ChatHeaderProps {
  chatName: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
  onDeleteChat: () => void;
  onOpenProfile: () => void;
  interlocutorAvatar: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ chatName, interlocutorDeleted, onBack, onDeleteChat, onOpenProfile, interlocutorAvatar }) => {
  const { translations } = useLanguage();
  return (
    <div className="px-6 py-4 border-b border-border flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={!interlocutorDeleted ? onOpenProfile : undefined} className="flex items-center space-x-2">
          <img src={interlocutorAvatar} alt={chatName} className="w-8 h-8 rounded-full" />
          <span className="text-lg font-semibold">{interlocutorDeleted ? 'Deleted User' : chatName}</span>
        </button>
      </div>
      <button onClick={onDeleteChat} className="text-destructive hover:text-destructive/90 transition-colors">
        {translations.deleteChat}
      </button>
    </div>
  );
};

export default ChatHeader;
