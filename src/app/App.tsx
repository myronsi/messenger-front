import { useState, useEffect, useRef } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import RegisterComponent from '@/features/auth/RegisterComponent';
import LoginComponent from '@/features/auth/LoginComponent';
import UsernameRecoveryComponent from '@/features/auth/UsernameRecoveryComponent';
import PartsRecoveryComponent from '@/features/auth/PartsRecoveryComponent';
import PasswordResetComponent from '@/features/auth/PasswordResetComponent';
import ChatsListComponentRTK from '@/features/chat/components/ChatsListComponentRTK';
import Chat from '@/features/chat';
import GroupComponent from '@/features/groups/GroupComponent';
import ProfileComponentRTK from '@/features/profiles/ProfileComponentRTK';
import UserProfileComponentRTK from '@/features/profiles/UserProfileComponentRTK';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Globe } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface CurrentChat {
  id: number;
  name: string;
  interlocutorDeleted: boolean;
  type: 'one-on-one' | 'group';
}

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const isMobile = useIsMobile();
  const { translations, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

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
    navigate('/');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group') => {
    // Only push URL for real chats (positive IDs). Preview chats use negative IDs and must not create a URL.
    if (chatId > 0) {
      try {
        navigate(`/chat/${chatId}`, { state: { chatName, interlocutorDeleted, type } });
      } catch (e) {
        // navigate may throw in some test environments; ignore
      }
    }
    setCurrentChat({ id: chatId, name: chatName, interlocutorDeleted, type });
  };

  const backToChats = () => {
    setCurrentChat(null);
    try {
      navigate('/');
    } catch (e) {}
    setIsUserProfileOpen(false);
  };

  // Sync currentChat from URL (supports direct links like /chat/123)
  const location = useLocation();
  useEffect(() => {
    const m = location.pathname.match(/^\/chat\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      // ignore negative preview IDs and chat 0 in the URL — redirect to root
      if (id <= 0) {
        navigate('/');
        return;
      }
      // if already open and same id, nothing to do
      if (currentChat && currentChat.id === id) return;

      // try to use location.state if provided (when navigated via openChat)
      const state: any = (location && (location as any).state) || {};
      const name = state.chatName || String(id);
      const interlocutorDeleted = !!state.interlocutorDeleted;
      const type = state.type || 'one-on-one';
      setCurrentChat({ id, name, interlocutorDeleted, type });
    } else {
      // not on chat route -> clear current chat
      if (currentChat) setCurrentChat(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
      {!isLoggedIn && (
        <div className="fixed top-4 right-4 z-50">
          <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ru')}>
            <SelectTrigger className="w-36 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 opacity-70" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Toaster />

      {!isLoggedIn ? (
        <div className="container mx-auto min-h-screen flex flex-col items-center justify-center space-y-8 p-4">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Messenger</h1>
            </div>
            <Routes>
              <Route path="/login" element={
                <LoginComponent
                  onLoginSuccess={handleLoginSuccess}
                  onRegisterClick={() => navigate('/register')}
                  onRecoverClick={() => navigate('/recover-username')}
                />
              } />
              <Route path="/register" element={
                <RegisterComponent
                  onLoginSuccess={handleLoginSuccess}
                  onBackToLogin={handleBackToLogin}
                />
              } />
              <Route path="/recover-username" element={
                <UsernameRecoveryComponent
                  onBackToLogin={handleBackToLogin}
                />
              } />
              <Route path="/recover-parts" element={
                <PartsRecoveryComponent
                  onBackToLogin={handleBackToLogin}
                />
              } />
              <Route path="/reset-password" element={
                <PasswordResetComponent
                  onBackToLogin={handleBackToLogin}
                />
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </div>
      ) : (
        <div className="mx-0 min-h-screen min-w-screen px-0">
          {isMobile ? (
            <div className="relative h-[calc(100vh)] overflow-hidden">
              <div className="absolute inset-0 bg-white rounded-lg shadow-lg overflow-hidden">
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  onChatDeleted={handleChatDeleted}
                />
              </div>
              <div
                className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
                  currentChat ? 'translate-x-0 z-50' : 'translate-x-full z-40'
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
                        onChatCreated={(newId: number, newName: string) => {
                          setCurrentChat({ id: newId, name: newName, interlocutorDeleted: false, type: 'one-on-one' });
                        }}
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
                  <UserProfileComponentRTK username={currentChat.name} onClose={() => setIsUserProfileOpen(false)} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-screen max-h-screen min-w-full overflow-hidden">
              <div className="w-1/4 bg-white rounded-lg shadow-lg overflow-auto">
                <ChatsListComponentRTK
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
                      onChatCreated={(newId: number, newName: string) => {
                        setCurrentChat({ id: newId, name: newName, interlocutorDeleted: false, type: 'one-on-one' });
                      }}
                    />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-gray-100 px-3 py-1 rounded-xl">
                      <p className="text-gray-500 text-sm">{translations.selectChat}</p>
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`transition-all duration-200 ease-in-out ${
                  isUserProfileOpen ? 'w-1/4' : 'w-0'
                } overflow-hidden bg-white`}
              >
                {isUserProfileOpen && currentChat && (
                  <UserProfileComponentRTK username={currentChat.name} onClose={() => setIsUserProfileOpen(false)} />
                )}
              </div>
            </div>
          )}
          {isProfileOpen && <ProfileComponentRTK username={username} onClose={() => setIsProfileOpen(false)} onLogout={() => setIsLoggedIn(false)} />}
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
