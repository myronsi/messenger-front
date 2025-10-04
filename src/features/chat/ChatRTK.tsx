import React from 'react';
import ChatHeader from './components/ChatHeader';
import MessageComponentRTK from './components/MessageComponentRTK';
import { DELETED_AVATAR, DEFAULT_AVATAR } from '@/shared/base/ui';

interface ChatRTKProps {
  chatId: number;
  chatName: string;
  username: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
}

const ChatRTK: React.FC<ChatRTKProps> = ({ 
  chatId, 
  chatName, 
  username, 
  interlocutorDeleted, 
  onBack, 
  setIsUserProfileOpen 
}) => {
  const interlocutorAvatar = interlocutorDeleted ? DELETED_AVATAR : DEFAULT_AVATAR;

  const onOpenProfile = () => {
    if (!interlocutorDeleted) {
      setIsUserProfileOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ChatHeader
        chatName={chatName}
        onBack={onBack}
        interlocutorDeleted={interlocutorDeleted}
        onDeleteChat={() => {
          // Handle delete chat logic here
          onBack();
        }}
        onOpenProfile={onOpenProfile}
        interlocutorAvatar={interlocutorAvatar}
      />
      
      <div className="flex-1 overflow-hidden">
        <MessageComponentRTK
          chatId={chatId}
          currentUsername={username}
        />
      </div>
    </div>
  );
};

export default ChatRTK;