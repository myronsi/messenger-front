import { useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import AuthFlowPage from '@/pages/auth/AuthFlowPage';
import ChatsListComponentRTK from '@/widgets/chat-list';
import Chat from '@/widgets/chat-room';
import GroupComponent from '@/widgets/group-chat';
import ProfileComponentRTK from '@/widgets/profile-panel';
import UserProfileComponentRTK from '@/widgets/profile-panel/UserProfileComponentRTK';
import { useMessengerController } from './model/useMessengerController';
import { MessengerAppSkeleton } from '@/shared/ui/messenger-skeletons';

const MessengerApp = () => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    username,
    currentChat,
    isProfileOpen,
    setIsProfileOpen,
    isUserProfileOpen,
    setIsUserProfileOpen,
    profileUsername,
    chatSearchRequestKey,
    isLoading,
    isMobile,
    translations,
    handleLoginSuccess,
    openChat,
    updateActiveChatFromList,
    openUserProfile,
    closeUserProfile,
    openCurrentChatSearch,
    canSearchCurrentDirectChat,
    openDirectChatFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleDeleteCurrentChat,
    mobileChatPanelClass,
  } = useMessengerController();

  const currentUserProfileProps = useMemo(() => ({
    username: profileUsername || currentChat?.name || '',
    onClose: closeUserProfile,
    onMessage: openDirectChatFromProfile,
    onSearchMessages: canSearchCurrentDirectChat() ? openCurrentChatSearch : undefined,
    onDeleteChat: currentChat?.type === 'one-on-one' && currentChat.id > 0 && (profileUsername || currentChat.name) === currentChat.name
      ? handleDeleteCurrentChat
      : undefined,
  }), [
    profileUsername,
    currentChat,
  ]);
  const [renderUserProfile, setRenderUserProfile] = useState(isUserProfileOpen);
  const [isUserProfileClosing, setIsUserProfileClosing] = useState(false);
  const [renderedUserProfileProps, setRenderedUserProfileProps] = useState(currentUserProfileProps);

  useEffect(() => {
    if (isUserProfileOpen && (currentChat || profileUsername)) {
      setRenderedUserProfileProps(currentUserProfileProps);
      setRenderUserProfile(true);
      setIsUserProfileClosing(true);
      const frameId = window.requestAnimationFrame(() => setIsUserProfileClosing(false));
      return () => window.cancelAnimationFrame(frameId);
    }

    if (!renderUserProfile) return;
    setIsUserProfileClosing(true);
    const timeoutId = window.setTimeout(() => {
      setRenderUserProfile(false);
      setIsUserProfileClosing(false);
    }, 220);
    return () => window.clearTimeout(timeoutId);
  }, [currentChat, currentUserProfileProps, isUserProfileOpen, profileUsername, renderUserProfile]);

  const requestCloseUserProfile = () => {
    if (isUserProfileClosing) return;
    setIsUserProfileClosing(true);
    window.setTimeout(() => {
      closeUserProfile();
    }, 160);
  };

  const userProfileProps = {
    ...renderedUserProfileProps,
    onClose: requestCloseUserProfile,
  };

  const activeChat = currentChat
    ? currentChat.type === 'group'
      ? (
        <GroupComponent
          key={currentChat.id}
          chatId={currentChat.id}
          groupName={currentChat.name}
          username={username}
          firstUnreadMessageId={currentChat.firstUnreadMessageId}
          onBack={backToChats}
          onOpenUserProfile={openUserProfile}
        />
      )
      : (
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
    : null;

  if (isLoading) {
    return <MessengerAppSkeleton isMobile={isMobile} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white">
      <Toaster />

      {!isLoggedIn ? (
        <AuthFlowPage onLoginSuccess={handleLoginSuccess} />
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
                {activeChat || (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">{translations.selectChat}</p>
                  </div>
                )}
              </div>

              {renderUserProfile && (
                <div
                  className={`fixed inset-0 z-[1000] bg-white transition-transform duration-200 ease-out ${
                    isUserProfileClosing ? 'translate-x-full opacity-95' : 'translate-x-0 opacity-100'
                  }`}
                >
                  <UserProfileComponentRTK {...userProfileProps} />
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

              <div className="w-3/4 bg-white rounded-lg shadow-lg overflow-hidden">
                {activeChat || (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-gray-100 px-3 py-1 rounded-xl">
                      <p className="text-gray-500 text-sm">{translations.selectChat}</p>
                    </div>
                  </div>
                )}
              </div>

              {renderUserProfile && (
                <div
                  className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-6 py-6 transition-opacity duration-200 ease-out ${
                    isUserProfileClosing ? 'opacity-0' : 'opacity-100'
                  }`}
                  onMouseDown={requestCloseUserProfile}
                >
                  <div
                    className={`h-[min(780px,calc(100vh-3rem))] w-[420px] max-w-full overflow-hidden rounded-lg bg-white shadow-2xl transition-all duration-200 ease-out ${
                      isUserProfileClosing ? 'translate-y-3 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
                    }`}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <UserProfileComponentRTK {...userProfileProps} />
                  </div>
                </div>
              )}
            </div>
          )}

          {isProfileOpen && (
            <ProfileComponentRTK
              username={username}
              onClose={() => setIsProfileOpen(false)}
              onLogout={() => setIsLoggedIn(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MessengerApp;
