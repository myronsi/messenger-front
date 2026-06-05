import { Toaster } from '@/shared/ui/toaster';
import AuthFlowPage from '@/pages/auth/AuthFlowPage';
import ChatsListComponentRTK from '@/widgets/chat-list';
import Chat from '@/widgets/chat-room';
import GroupComponent from '@/widgets/group-chat';
import ProfileComponentRTK from '@/widgets/profile-panel';
import UserProfileComponentRTK from '@/widgets/profile-panel/UserProfileComponentRTK';
import { useMessengerController } from './model/useMessengerController';

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

  const userProfileProps = {
    username: profileUsername || currentChat?.name || '',
    onClose: closeUserProfile,
    onMessage: openDirectChatFromProfile,
    onSearchMessages: canSearchCurrentDirectChat() ? openCurrentChatSearch : undefined,
    onDeleteChat: currentChat?.type === 'one-on-one' && currentChat.id > 0 && (profileUsername || currentChat.name) === currentChat.name
      ? handleDeleteCurrentChat
      : undefined,
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

              {isUserProfileOpen && (currentChat || profileUsername) && (
                <div className="fixed inset-0 z-[70] bg-white">
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

              {isUserProfileOpen && (currentChat || profileUsername) && (
                <div
                  className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6 py-8"
                  onMouseDown={closeUserProfile}
                >
                  <div
                    className="h-[min(720px,calc(100vh-4rem))] w-[420px] max-w-full overflow-y-auto rounded-lg bg-white shadow-2xl"
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
