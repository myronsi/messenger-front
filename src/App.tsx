
import { useState, useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import RegisterComponent from '@/auth/RegisterComponent';
import LoginComponent from '@/auth/LoginComponent';
import ChatsListComponent from '@/chats/chat-list/ChatsListComponent';
import Chat from '@/chats/chat/';
import GroupComponent from '@/chats/group/GroupComponent';
import ProfileComponent from '@/profiles/ProfileComponent';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface CurrentChat {
  id: number;
  name: string;
  interlocutorDeleted: boolean;
  type: 'one-on-one' | 'group';
}

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const isMobile = useIsMobile();
  const { translations } = useLanguage();

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    const token = localStorage.getItem('access_token');
    if (token) {
      fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (response.ok) return response.json();
          throw new Error('Токен недействителен');
        })
        .then((user) => {
          setIsLoggedIn(true);
          setUsername(user.username);
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          setIsLoggedIn(false);
          setUsername('');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLoginSuccess = (user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
    setIsLoading(false);
  };

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => {
    setCurrentChat({ id: chatId, name: chatName, interlocutorDeleted, type });
  };

  const backToChats = () => {
    setCurrentChat(null);
  };

  const handleChatDeleted = (chatId: number) => {
    if (currentChat && currentChat.id === chatId) {
      console.log(`Active chat ${chatId} deleted, clearing currentChat`);
      setCurrentChat(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white">
        <div className="animate-pulse text-blue-500 text-lg">{translations.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white">
      <Toaster />
      {!isLoggedIn ? (
        <div className="container mx-auto min-h-screen flex flex-col items-center justify-center space-y-8 p-4">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Messenger</h1>
            </div>
            {showRegister ? (
              <RegisterComponent 
                onLoginSuccess={handleLoginSuccess}
                onBackToLogin={() => setShowRegister(false)}
              />
            ) : (
              <LoginComponent 
                onLoginSuccess={handleLoginSuccess}
                onRegisterClick={() => setShowRegister(true)}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="container mx-auto min-h-screen p-4">
          <div className="grid grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
            <div className={`${isMobile && currentChat ? 'hidden' : 'block'} ${isMobile ? 'col-span-4' : 'col-span-1'} bg-white rounded-lg shadow-lg overflow-hidden`}>
              <ChatsListComponent
                username={username}
                onChatOpen={openChat}
                setIsProfileOpen={setIsProfileOpen}
                activeChatId={currentChat?.id}
                onChatDeleted={handleChatDeleted}
              />
            </div>
            <div className={`${isMobile && !currentChat ? 'hidden' : 'block'} ${isMobile ? 'col-span-4 chat-slide-in' : 'col-span-3'} bg-white rounded-lg shadow-lg overflow-hidden`}>
              {currentChat ? (
                currentChat.type === 'group' ? (
                  <GroupComponent
                    key={currentChat.id}
                    chatId={currentChat.id}
                    groupName={currentChat.name}
                    username={username}
                    onBack={backToChats}
                  />
                ) : (
                  <Chat
                    key={currentChat.id}
                    chatId={currentChat.id}
                    chatName={currentChat.name}
                    username={username}
                    interlocutorDeleted={currentChat.interlocutorDeleted}
                    onBack={backToChats}
                  />
                )
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">{translations.selectChat}</p>
                </div>
              )}
            </div>
          </div>
          {isProfileOpen && <ProfileComponent onClose={() => setIsProfileOpen(false)} />}
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
