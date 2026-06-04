import { useState, useEffect, useRef, useCallback } from 'react';
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
import { authFetch, clearAuthTokens } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const dmPath = (username: string) => `/dm/@${encodeURIComponent(username.replace(/^@/, ''))}`;
const dmChatPath = (chatId: number) => `/dm/${chatId}`;
const directChatPath = (chatId: number, username: string, interlocutorDeleted?: boolean) => (
  interlocutorDeleted ? dmChatPath(chatId) : dmPath(username)
);

const parseDmIdentifier = (pathname: string) => {
  const match = pathname.match(/^\/(?:dm|direct)\/([^/]+)$/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]).trim();
  const normalized = decoded.replace(/^@/, '');
  if (/^\d+$/.test(normalized)) {
    return { type: 'chatId' as const, value: Number(normalized) };
  }
  return { type: 'username' as const, value: normalized };
};

const parseProfileUsername = (pathname: string) => {
  const match = pathname.match(/^\/@([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]).trim();
};

interface CurrentChat {
  id: number;
  name: string;
  displayName?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string;
  interlocutorDeleted: boolean;
  type: 'one-on-one' | 'group';
  firstUnreadMessageId?: number | null;
  directDraftDisabled?: boolean;
  directDraftReason?: 'self' | 'blocked' | 'privacy' | null;
}

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentChat, setCurrentChat] = useState<CurrentChat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [chatSearchRequestKey, setChatSearchRequestKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileChatStage, setMobileChatStage] = useState<'closed' | 'open' | 'closing'>('closed');
  const hasFetchedUser = useRef(false);
  const mobileChatCloseTimerRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const { translations, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    const loadCurrentUser = async () => {
      const fetchMe = async () => {
        const response = await authFetch(`${BASE_URL}/auth/me`);
        if (!response.ok) throw new Error('Invalid token');
        return response.json();
      };

      try {
        const user = await fetchMe();

        setIsLoggedIn(true);
        setUsername(user.username);
      } catch {
        clearAuthTokens();
        setIsLoggedIn(false);
        setUsername('');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
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

  const clearMobileChatCloseTimer = useCallback(() => {
    if (mobileChatCloseTimerRef.current !== null) {
      window.clearTimeout(mobileChatCloseTimerRef.current);
      mobileChatCloseTimerRef.current = null;
    }
  }, []);

  const openChat = (chatId: number, chatName: string, interlocutorDeleted: boolean, type: 'one-on-one' | 'group', chatDisplayName?: string, isOnline?: boolean, lastSeen?: string | null, firstUnreadMessageId?: number | null, avatarUrl?: string) => {
    clearMobileChatCloseTimer();
    if (isMobile) {
      setMobileChatStage('closed');
    }
    if (type === 'one-on-one' || chatId > 0) {
      try {
        navigate(type === 'one-on-one' ? directChatPath(chatId, chatName, interlocutorDeleted) : `/chat/${chatId}`, { state: { chatName, chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId, chatId } });
      } catch (e) {
        // navigate may throw in some test environments; ignore
      }
    }
    setCurrentChat({ id: chatId, name: chatName, displayName: chatDisplayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId });
    if (isMobile) {
      requestAnimationFrame(() => setMobileChatStage('open'));
    }
  };

  const updateActiveChatFromList = useCallback((chat: {
    id: number;
    name: string;
    display_name?: string;
    avatar_url: string;
    is_online?: boolean;
    last_seen?: string | null;
    interlocutor_deleted: boolean;
    type: 'one-on-one' | 'group';
    first_unread_message_id?: number | null;
  }) => {
    setCurrentChat((current) => {
      if (!current || current.id !== chat.id) return current;

      const nextFirstUnreadMessageId = chat.first_unread_message_id ?? current.firstUnreadMessageId;
      if (
        current.name === chat.name &&
        current.displayName === chat.display_name &&
        current.isOnline === chat.is_online &&
        current.lastSeen === (chat.last_seen ?? null) &&
        current.avatarUrl === chat.avatar_url &&
        current.interlocutorDeleted === chat.interlocutor_deleted &&
        current.type === chat.type &&
        current.firstUnreadMessageId === nextFirstUnreadMessageId
      ) {
        return current;
      }

      return {
        ...current,
        name: chat.name,
        displayName: chat.display_name,
        isOnline: chat.is_online,
        lastSeen: chat.last_seen ?? null,
        avatarUrl: chat.avatar_url,
        interlocutorDeleted: chat.interlocutor_deleted,
        type: chat.type,
        firstUnreadMessageId: nextFirstUnreadMessageId,
      };
    });
  }, []);

  const openUserProfile = (targetUsername: string) => {
    setProfileUsername(targetUsername);
    setIsUserProfileOpen(true);
  };

  const closeUserProfile = () => {
    setIsUserProfileOpen(false);
    setProfileUsername(null);
    if (parseProfileUsername(location.pathname) !== null) {
      navigate('/');
    }
  };

  const openCurrentChatSearch = () => {
    setChatSearchRequestKey((key) => key + 1);
    closeUserProfile();
  };

  const canSearchCurrentDirectChat = () => (
    currentChat?.type === 'one-on-one' &&
    currentChat.id > 0 &&
    (profileUsername || currentChat.name) === currentChat.name
  );

  const openDirectChatFromProfile = async (target: {
    username: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }) => {
    const targetUsername = target.username.trim();
    if (!targetUsername || targetUsername.toLowerCase() === username.toLowerCase()) {
      closeUserProfile();
      return;
    }

    closeUserProfile();
    navigate(dmPath(targetUsername), {
      state: {
        chatDisplayName: target.displayName || targetUsername,
        isOnline: target.isOnline,
        lastSeen: target.lastSeen ?? null,
      },
    });
  };

  const handleDirectChatCreated = (newId: number, newName: string) => {
    const nextChat = {
      id: newId,
      name: newName,
      displayName: currentChat?.displayName,
      isOnline: currentChat?.isOnline,
      lastSeen: currentChat?.lastSeen,
      avatarUrl: currentChat?.avatarUrl,
      interlocutorDeleted: false,
      type: 'one-on-one' as const,
      firstUnreadMessageId: null,
    };
    setCurrentChat(nextChat);
    navigate(directChatPath(newId, newName, nextChat.interlocutorDeleted), {
      replace: currentChat?.id === 0,
      state: {
        chatId: nextChat.id,
        chatName: nextChat.name,
        chatDisplayName: nextChat.displayName,
        isOnline: nextChat.isOnline,
        lastSeen: nextChat.lastSeen,
        avatarUrl: nextChat.avatarUrl,
        interlocutorDeleted: nextChat.interlocutorDeleted,
        type: nextChat.type,
        firstUnreadMessageId: nextChat.firstUnreadMessageId,
      },
    });
  };

  const finishBackToChats = useCallback(() => {
    clearMobileChatCloseTimer();
    setCurrentChat(null);
    setMobileChatStage('closed');
    setIsUserProfileOpen(false);
    setProfileUsername(null);
    try {
      navigate('/');
    } catch (e) {}
  }, [clearMobileChatCloseTimer, navigate]);

  const backToChats = useCallback(() => {
    if (isMobile && currentChat) {
      clearMobileChatCloseTimer();
      setMobileChatStage('closing');
      mobileChatCloseTimerRef.current = window.setTimeout(() => {
        finishBackToChats();
      }, 260);
      return;
    }

    finishBackToChats();
  }, [clearMobileChatCloseTimer, currentChat, finishBackToChats, isMobile]);

  useEffect(() => {
    if (!currentChat) {
      setMobileChatStage('closed');
    } else if (isMobile) {
      requestAnimationFrame(() => setMobileChatStage('open'));
    }
  }, [currentChat, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileChatStage('closed');
      clearMobileChatCloseTimer();
    }
  }, [clearMobileChatCloseTimer, isMobile]);

  useEffect(() => () => clearMobileChatCloseTimer(), [clearMobileChatCloseTimer]);

  // Sync currentChat from URL (supports group links like /chat/123 and DMs like /dm/@username)
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
      const displayName = state.chatDisplayName;
      const isOnline = state.isOnline;
      const lastSeen = state.lastSeen;
      const avatarUrl = state.avatarUrl;
      const interlocutorDeleted = !!state.interlocutorDeleted;
      const type = state.type || 'one-on-one';
      const firstUnreadMessageId = state.firstUnreadMessageId ?? null;
      if (type === 'one-on-one' && state.chatName) {
        navigate(directChatPath(id, state.chatName, interlocutorDeleted), {
          replace: true,
          state: { ...state, chatId: id },
        });
        return;
      }
      setCurrentChat({ id, name, displayName, isOnline, lastSeen, avatarUrl, interlocutorDeleted, type, firstUnreadMessageId });
      return;
    }

    const directIdentifier = parseDmIdentifier(location.pathname);
    if (directIdentifier !== null) {
      if (!username) return;

      let isCancelled = false;
      const state: any = (location && (location as any).state) || {};
      if (state.chatName || state.chatDisplayName || state.chatId) {
        setCurrentChat({
          id: state.chatId || 0,
          name: state.chatName || directIdentifier.value,
          displayName: state.chatDisplayName || state.chatName || directIdentifier.value,
          isOnline: state.isOnline,
          lastSeen: state.lastSeen ?? null,
          avatarUrl: state.avatarUrl,
          interlocutorDeleted: !!state.interlocutorDeleted,
          type: 'one-on-one',
          firstUnreadMessageId: state.firstUnreadMessageId ?? null,
        });
      } else {
        setCurrentChat(null);
      }

      if (directIdentifier.type === 'chatId') {
        const targetChatId = directIdentifier.value;
        if (!targetChatId) {
          navigate('/', { replace: true });
          return;
        }

        authFetch(`${BASE_URL}/chats/list/${encodeURIComponent(username)}`)
          .then(async (response) => {
            if (!response.ok) throw new Error(await response.text());
            return response.json();
          })
          .then((data) => {
            if (isCancelled) return;
            const chat = (data.chats || []).find((item: any) => item.id === targetChatId);
            if (!chat) {
              navigate('/', { replace: true });
              return;
            }
            const canonicalPath = directChatPath(chat.id, chat.interlocutor_name, chat.interlocutor_deleted);
            if (location.pathname !== canonicalPath) {
              navigate(canonicalPath, {
                replace: true,
                state: {
                  chatId: chat.id,
                  chatName: chat.interlocutor_name,
                  chatDisplayName: chat.interlocutor_display_name,
                  isOnline: chat.interlocutor_is_online,
                  lastSeen: chat.interlocutor_last_seen,
                  avatarUrl: chat.avatar_url,
                  interlocutorDeleted: chat.interlocutor_deleted,
                  type: 'one-on-one',
                  firstUnreadMessageId: chat.first_unread_message_id ?? null,
                },
              });
            }
            setCurrentChat({
              id: chat.id,
              name: chat.interlocutor_name,
              displayName: chat.interlocutor_display_name,
              isOnline: chat.interlocutor_is_online,
              lastSeen: chat.interlocutor_last_seen ?? null,
              avatarUrl: chat.avatar_url,
              interlocutorDeleted: chat.interlocutor_deleted,
              type: 'one-on-one',
              firstUnreadMessageId: chat.first_unread_message_id ?? null,
            });
          })
          .catch((error) => {
            if (isCancelled) return;
            console.error('Error loading direct chat by id:', error);
            setCurrentChat(null);
          });

        return () => {
          isCancelled = true;
        };
      }

      const targetUsername = directIdentifier.value;
      if (!targetUsername || targetUsername.toLowerCase() === username.toLowerCase()) {
        navigate('/', { replace: true });
        return;
      }

      authFetch(`${BASE_URL}/users/users/${encodeURIComponent(targetUsername)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text());
          return response.json();
        })
        .then((user) => {
          if (isCancelled) return;
          const canonicalPath = directChatPath(user.direct_chat_id || state.chatId || 0, user.username || targetUsername, false);
          if (location.pathname !== canonicalPath) {
            navigate(canonicalPath, {
              replace: true,
              state: {
                ...state,
                chatId: user.direct_chat_id || state.chatId,
                chatName: user.username || targetUsername,
                chatDisplayName: user.display_name || state.chatDisplayName || targetUsername,
                isOnline: user.is_online ?? state.isOnline,
                lastSeen: user.last_seen ?? state.lastSeen ?? null,
                avatarUrl: user.avatar_url ?? state.avatarUrl,
              },
            });
          }

          setCurrentChat({
            id: user.direct_chat_id || state.chatId || 0,
            name: user.username || targetUsername,
            displayName: user.display_name || state.chatDisplayName || targetUsername,
            isOnline: user.is_online ?? state.isOnline,
            lastSeen: user.last_seen ?? state.lastSeen ?? null,
            avatarUrl: user.avatar_url ?? state.avatarUrl,
            interlocutorDeleted: false,
            type: 'one-on-one',
            firstUnreadMessageId: null,
            directDraftDisabled: !user.can_message,
            directDraftReason: user.direct_message_reason ?? null,
          });
        })
        .catch((error) => {
          if (isCancelled) return;
          console.error('Error loading direct chat draft:', error);
          setCurrentChat(null);
        });

      return () => {
        isCancelled = true;
      };
    }

    const profileRouteUsername = parseProfileUsername(location.pathname);
    if (profileRouteUsername !== null) {
      if (!username) return;
      if (!profileRouteUsername) {
        navigate('/', { replace: true });
        return;
      }
      setCurrentChat(null);
      setProfileUsername(profileRouteUsername);
      setIsUserProfileOpen(true);
      return;
    } else {
      // not on chat route -> clear current chat
      if (currentChat) setCurrentChat(null);
      if (isUserProfileOpen) closeUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, username]);

  const handleChatDeleted = (chatId: number) => {
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  };

  const handleDeleteCurrentChat = async () => {
    if (!currentChat || currentChat.type !== 'one-on-one' || currentChat.id <= 0) return;
    if (!window.confirm(translations.deleteChatConfirm)) return;

    try {
      const response = await authFetch(`${BASE_URL}/chats/delete/${currentChat.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await response.text());
      setIsUserProfileOpen(false);
      setCurrentChat(null);
      navigate('/');
    } catch (err) {
      console.error('Error deleting chat from user profile:', err);
    }
  };

  const isMobileChatPanelOpen = currentChat && mobileChatStage === 'open';
  const mobileChatPanelClass = isMobileChatPanelOpen ? 'translate-x-0' : 'translate-x-full';

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
              <div className="absolute inset-0 overflow-hidden bg-white">
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={undefined}
                  onActiveChatUpdate={updateActiveChatFromList}
                  onChatDeleted={handleChatDeleted}
                />
              </div>
              <div
                className={`absolute inset-0 z-50 overflow-hidden bg-white transition-transform duration-300 ease-out will-change-transform ${mobileChatPanelClass}`}
                style={{ pointerEvents: currentChat ? 'auto' : 'none' }}
              >
                  {currentChat ? (
                    currentChat.type === 'group' ? (
                      <GroupComponent
                        key={currentChat.id}
                        chatId={currentChat.id}
                        groupName={currentChat.name}
                        username={username}
                        firstUnreadMessageId={currentChat.firstUnreadMessageId}
                        onBack={backToChats}
                        onOpenUserProfile={openUserProfile}
                      />
                    ) : (
                      <Chat
                        key={`${currentChat.type}-${currentChat.id}-${currentChat.name}`}
                        chatId={currentChat.id}
                        chatName={currentChat.name}
                        chatDisplayName={currentChat.displayName}
                        interlocutorIsOnline={currentChat.isOnline}
                        interlocutorLastSeen={currentChat.lastSeen}
                        interlocutorAvatarUrl={currentChat.avatarUrl}
                        username={username}
                        interlocutorDeleted={currentChat.interlocutorDeleted}
                        firstUnreadMessageId={currentChat.firstUnreadMessageId}
                        onBack={backToChats}
                        setIsUserProfileOpen={setIsUserProfileOpen}
                        onOpenUserProfile={openUserProfile}
                        searchRequestKey={chatSearchRequestKey}
                        directDraftDisabled={currentChat.directDraftDisabled}
                        directDraftReason={currentChat.directDraftReason}
                        onChatCreated={handleDirectChatCreated}
                      />
                    )
                  ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">{translations.selectChat}</p>
                  </div>
                )}
              </div>
              {isUserProfileOpen && (currentChat || profileUsername) && (
                <div className="fixed inset-0 z-[70] bg-white">
                  <UserProfileComponentRTK
                    username={profileUsername || currentChat?.name || ''}
                    onClose={closeUserProfile}
                    onMessage={openDirectChatFromProfile}
                    onSearchMessages={canSearchCurrentDirectChat() ? openCurrentChatSearch : undefined}
                    onDeleteChat={currentChat?.type === 'one-on-one' && currentChat.id > 0 && (profileUsername || currentChat.name) === currentChat.name ? handleDeleteCurrentChat : undefined}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-screen max-h-screen min-w-full overflow-hidden">
              <div className="w-1/4 bg-white rounded-lg shadow-lg overflow-auto">
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  onActiveChatUpdate={updateActiveChatFromList}
                  onChatDeleted={handleChatDeleted}
                />
              </div>
              <div
                className="w-3/4 bg-white rounded-lg shadow-lg overflow-hidden"
              >
                {currentChat ? (
                  currentChat.type === 'group' ? (
                    <GroupComponent
                      key={currentChat.id}
                      chatId={currentChat.id}
                      groupName={currentChat.name}
                      username={username}
                      firstUnreadMessageId={currentChat.firstUnreadMessageId}
                      onBack={backToChats}
                      onOpenUserProfile={openUserProfile}
                    />
                    ) : (
                    <Chat
                      key={`${currentChat.type}-${currentChat.id}-${currentChat.name}`}
                      chatId={currentChat.id}
                      chatName={currentChat.name}
                      chatDisplayName={currentChat.displayName}
                      interlocutorIsOnline={currentChat.isOnline}
                      interlocutorLastSeen={currentChat.lastSeen}
                      interlocutorAvatarUrl={currentChat.avatarUrl}
                      username={username}
                      interlocutorDeleted={currentChat.interlocutorDeleted}
                      firstUnreadMessageId={currentChat.firstUnreadMessageId}
                      onBack={backToChats}
                      setIsUserProfileOpen={setIsUserProfileOpen}
                      onOpenUserProfile={openUserProfile}
                      searchRequestKey={chatSearchRequestKey}
                      directDraftDisabled={currentChat.directDraftDisabled}
                      directDraftReason={currentChat.directDraftReason}
                      onChatCreated={handleDirectChatCreated}
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
              {isUserProfileOpen && (currentChat || profileUsername) && (
                <div
                  className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6 py-8"
                  onMouseDown={closeUserProfile}
                >
                  <div
                    className="h-[min(720px,calc(100vh-4rem))] w-[420px] max-w-full overflow-y-auto rounded-lg bg-white shadow-2xl"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <UserProfileComponentRTK
                      username={profileUsername || currentChat?.name || ''}
                      onClose={closeUserProfile}
                      onMessage={openDirectChatFromProfile}
                      onSearchMessages={canSearchCurrentDirectChat() ? openCurrentChatSearch : undefined}
                      onDeleteChat={currentChat?.type === 'one-on-one' && currentChat.id > 0 && (profileUsername || currentChat.name) === currentChat.name ? handleDeleteCurrentChat : undefined}
                    />
                  </div>
                </div>
              )}
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
