
import { useState, useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import RegisterComponent from './components/RegisterComponent';
import LoginComponent from './components/LoginComponent';
import ChatsListComponent from './components/ChatsListComponent';
import ChatComponent from './components/ChatComponent';
import ProfileComponent from './components/ProfileComponent';
import { useIsMobile } from './hooks/use-mobile';

interface CurrentChat {
  id: number;
  name: string;
  interlocutorDeleted: boolean;
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);
  const isMobile = useIsMobile();

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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setUsername('');
    setCurrentChat(null);
    setIsProfileOpen(false);
  };

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean) => {
    setCurrentChat({ id: chatId, name: chatName, interlocutorDeleted });
  };

  const backToChats = () => {
    setCurrentChat(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
        <div className="animate-pulse text-primary text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background">
      <Toaster />
      {!isLoggedIn ? (
        <div className="container mx-auto min-h-screen flex flex-col items-center justify-center space-y-8 p-4">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Messenger</h1>
              <p className="text-muted-foreground">Войдите или зарегистрируйтесь</p>
            </div>
            <div className="space-y-6">
              <LoginComponent onLoginSuccess={handleLoginSuccess} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Или</span>
                </div>
              </div>
              <RegisterComponent onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto min-h-screen p-4">
          <div className="grid grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
            <div className={`${isMobile && currentChat ? 'hidden' : 'block'} ${isMobile ? 'col-span-4' : 'col-span-1'} bg-card rounded-lg shadow-lg overflow-hidden`}>
              <ChatsListComponent
                username={username}
                onChatOpen={openChat}
                setIsProfileOpen={setIsProfileOpen}
                activeChatId={currentChat?.id}
              />
            </div>
            <div className={`${isMobile && !currentChat ? 'hidden' : 'block'} ${isMobile ? 'col-span-4 chat-slide-in' : 'col-span-3'} bg-card rounded-lg shadow-lg overflow-hidden`}>
              {currentChat ? (
                <ChatComponent
                  key={currentChat.id}
                  chatId={currentChat.id}
                  chatName={currentChat.name}
                  username={username}
                  interlocutorDeleted={currentChat.interlocutorDeleted}
                  onBack={backToChats}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Выберите чат для начала общения</p>
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

export default App;
