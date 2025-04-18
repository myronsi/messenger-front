
import { useState, useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import RegisterComponent from './components/RegisterComponent';
import LoginComponent from './components/LoginComponent';
import ChatsListComponent from './components/ChatsListComponent';
import ChatComponent from './components/ChatComponent';
import GroupComponent from './components/GroupComponent';
import ProfileComponent from './components/ProfileComponent';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLanguage } from './contexts/LanguageContext';
import { useIsMobile } from './hooks/use-mobile';

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
      fetch('http://192.168.178.29:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (response.ok) return response.json();
          throw new Error('Token is invalid');
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
    setShowRegister(false);
    setIsLoading(false);
  };

  const openChat = (chat: CurrentChat) => {
    setCurrentChat(chat);
  };

  const handleChatDeleted = () => {
    setCurrentChat(null);
  };

  const backToChats = () => {
    setCurrentChat(null);
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
                  <ChatComponent
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
