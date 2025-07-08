import { useState, useEffect, useRef } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import RegisterComponent from '@/features/auth/RegisterComponent';
import LoginComponent from '@/features/auth/LoginComponent';
import RecoverPasswordComponent from '@/features/auth/RecoverPasswordComponent';
import ChatsListComponent from '@/features/chat/components/ChatsListComponent';
import Chat from '@/features/chat';
import GroupComponent from '@/features/groups/GroupComponent';
import ProfileComponent from '@/features/profiles/ProfileComponent';
import UserProfileComponent from '@/features/profiles/UserProfileComponent';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useIsMobile } from '@/shared/hooks/use-mobile';

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
  const [showRecover, setShowRecover] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
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
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLoginSuccess = (user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
    setIsLoading(false);
    setShowRecover(false);
    setShowRegister(false);
  };

  const handleBackToLogin = () => {
    setShowRecover(false);
    setShowRegister(false);
  };

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => {
    setCurrentChat({ id: chatId, name: chatName, interlocutorDeleted, type });
  };

  const backToChats = () => {
    setCurrentChat(null);
    setIsUserProfileOpen(false);
  };

  const handleChatDeleted = (chatId: number) => {
    if (currentChat && currentChat.id === chatId) {
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
                onBackToLogin={handleBackToLogin}
              />
            ) : showRecover ? (
              <RecoverPasswordComponent
                onBackToLogin={handleBackToLogin}
              />
            ) : (
              <LoginComponent
                onLoginSuccess={handleLoginSuccess}
                onRegisterClick={() => setShowRegister(true)}
                onRecoverClick={() => setShowRecover(true)}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="mx-0 min-h-screen min-w-screen px-0">
          {isMobile ? (
            <div className="relative h-[calc(100vh)] overflow-hidden">
              <div
                className={`absolute inset-0 transition-transform duration-200 ease-in-out ${
                  currentChat ? '-translate-x-full' : 'translate-x-0'
                } bg-white rounded-lg shadow-lg overflow-hidden`}
              >
                <ChatsListComponent
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  onChatDeleted={handleChatDeleted}
                />
              </div>
              <div
                className={`absolute inset-0 transition-transform duration-200 ease-in-out ${
                  currentChat ? 'translate-x-0' : 'translate-x-full'
                } bg-white rounded-lg shadow-lg overflow-hidden`}
              >
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
                      setIsUserProfileOpen={setIsUserProfileOpen}
                    />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">{translations.selectChat}</p>
                  </div>
                )}
              </div>
              <div
                className={`fixed inset-y-0 right-0 w-full bg-white shadow-lg transition-transform duration-200 ease-in-out z-50 ${
                  isUserProfileOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                {isUserProfileOpen && currentChat && (
                  <UserProfileComponent username={currentChat.name} onClose={() => setIsUserProfileOpen(false)} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-screen max-h-screen min-w-full overflow-hidden">
              <div className="w-1/4 bg-white rounded-lg shadow-lg overflow-auto">
                <ChatsListComponent
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  onChatDeleted={handleChatDeleted}
                />
              </div>
              <div
                className={`transition-all duration-200 ease-in-out ${
                  isUserProfileOpen ? 'w-2/4' : 'w-3/4'
                } bg-white rounded-lg shadow-lg overflow-hidden`}
              >
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
                      setIsUserProfileOpen={setIsUserProfileOpen}
                    />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">{translations.selectChat}</p>
                  </div>
                )}
              </div>
              <div
                className={`transition-all duration-200 ease-in-out ${
                  isUserProfileOpen ? 'w-1/4' : 'w-0'
                } overflow-hidden bg-white`}
              >
                {isUserProfileOpen && currentChat && (
                  <UserProfileComponent username={currentChat.name} onClose={() => setIsUserProfileOpen(false)} />
                )}
              </div>
            </div>
          )}
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
