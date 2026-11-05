import { RecoverySetupPrompt, RecoveryApprovalPrompt, SecurityNoticeHandler } from '@/widgets/profile-panel';
import { isGoApi } from '@/shared/api/goSocket';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import ChatsListComponentRTK from '@/widgets/chat-list';
import Chat from '@/widgets/chat-room';
import GroupComponent from '@/widgets/group-chat';
import ProfileComponentRTK from '@/widgets/profile-panel';
import { UserProfileComponentRTK, UserProfileLayer } from '@/widgets/profile-panel';
import { useMessengerController } from './model/useMessengerController';
import { MessengerAppSkeleton } from '@/shared/ui/messenger-skeletons';
import { useVisualViewport, visualViewportStyle } from '@/shared/lib/useVisualViewport';
import { DesktopChatLayout } from './ui/DesktopChatLayout';
import { useJumpRequest } from './model/useJumpRequest';

interface MessengerAppProps {
  renderAuthPage: (props: { onLoginSuccess: (username: string) => void }) => ReactNode;
}

const MessengerApp = ({ renderAuthPage }: MessengerAppProps) => {
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
    isLoading,
    isMobile,
    translations,
    handleLoginSuccess,
    openChat,
    updateActiveChatFromList,
    openUserProfile,
    closeUserProfile,
    openDirectChatFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleDeleteCurrentChat,
    mobileChatPanelClass,
    mobilePanelChat,
  } = useMessengerController();

  const currentUserProfileProps = useMemo(() => ({
    username: profileUsername || currentChat?.name || '',
    directChatId: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name
      ? currentChat.id
      : undefined,
    onClose: closeUserProfile,
    onMessage: openDirectChatFromProfile,
    hideMessageAction: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name,
    onDeleteChat: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name
      ? handleDeleteCurrentChat
      : undefined,
  }), [
    profileUsername,
    currentChat,
  ]);
  const [renderUserProfile, setRenderUserProfile] = useState(isUserProfileOpen);
  const [isUserProfileClosing, setIsUserProfileClosing] = useState(false);
  const { requestJump, requestFor } = useJumpRequest(currentChat?.id);
  const [renderedUserProfileProps, setRenderedUserProfileProps] = useState(currentUserProfileProps);
  useVisualViewport(isMobile && isLoggedIn);

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

  const jumpChatId = renderedUserProfileProps.directChatId;
  const userProfileProps = {
    ...renderedUserProfileProps,
    onJumpToMessage: jumpChatId ? (messageId: EntityId) => {
      requestCloseUserProfile();
      requestJump(jumpChatId, messageId);
    } : undefined,
    onClose: requestCloseUserProfile,
  };

  const activeChat = mobilePanelChat
    ? mobilePanelChat.type === 'group'
      ? (
        <GroupComponent
          key={mobilePanelChat.id}
          chatId={mobilePanelChat.id}
          groupName={mobilePanelChat.name}
          username={username}
          firstUnreadMessageId={mobilePanelChat.firstUnreadMessageId}
          onBack={backToChats}
          onOpenUserProfile={openUserProfile}
        />
      )
      : (
        <Chat
          key={`${mobilePanelChat.type}-${mobilePanelChat.id}-${mobilePanelChat.name}`}
          chatId={mobilePanelChat.id}
          chatName={mobilePanelChat.name}
          chatDisplayName={mobilePanelChat.displayName}
          interlocutorIsOnline={mobilePanelChat.isOnline}
          interlocutorLastSeen={mobilePanelChat.lastSeen}
          interlocutorAvatarUrl={mobilePanelChat.avatarUrl}
          username={username}
          interlocutorDeleted={mobilePanelChat.interlocutorDeleted}
          firstUnreadMessageId={mobilePanelChat.firstUnreadMessageId}
          onBack={backToChats}
          setIsUserProfileOpen={setIsUserProfileOpen}
          onOpenUserProfile={openUserProfile}
          messageJumpRequest={requestFor(mobilePanelChat.id)}
          directDraftDisabled={mobilePanelChat.directDraftDisabled}
          directDraftReason={mobilePanelChat.directDraftReason}
          initialPendingApprovalRequest={mobilePanelChat.pendingApprovalRequest}
          initialPendingApprovalMessage={mobilePanelChat.pendingApprovalMessage}
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
      {isLoggedIn && isGoApi() && <RecoverySetupPrompt key={username} />}
      {isLoggedIn && <RecoveryApprovalPrompt key={`approval:${username}`} />}
      {isLoggedIn && <SecurityNoticeHandler key={`security:${username}`} />}

      {!isLoggedIn ? (
        renderAuthPage({ onLoginSuccess: handleLoginSuccess })
      ) : (
        <div className="mx-0 min-h-screen min-w-screen px-0">
          {isMobile ? (
            <div className="fixed inset-x-0 overflow-hidden" style={visualViewportStyle}>
              <div className="absolute inset-0 overflow-hidden bg-white">
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  activeChatName={currentChat?.name}
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
                <UserProfileLayer isMobile isClosing={isUserProfileClosing} onClose={requestCloseUserProfile}>
                  <UserProfileComponentRTK {...userProfileProps} />
                </UserProfileLayer>
              )}
            </div>
          ) : (
            <div className="flex h-screen max-h-screen min-w-full overflow-hidden">
              <DesktopChatLayout resizeLabel={translations.resizeChatList} chatList={
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  activeChatId={currentChat?.id}
                  activeChatName={currentChat?.name}
                  onActiveChatUpdate={updateActiveChatFromList}
                  onChatDeleted={handleChatDeleted}
                />
              }>
                {activeChat || (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-gray-100 px-3 py-1 rounded-xl">
                      <p className="text-gray-500 text-sm">{translations.selectChat}</p>
                    </div>
                  </div>
                )}
              </DesktopChatLayout>

              {renderUserProfile && (
                <UserProfileLayer isMobile={false} isClosing={isUserProfileClosing} onClose={requestCloseUserProfile}>
                  <UserProfileComponentRTK {...userProfileProps} />
                </UserProfileLayer>
              )}
            </div>
          )}

          {isProfileOpen && (
            <ProfileComponentRTK
              username={username}
              onClose={() => setIsProfileOpen(false)}
              onLogout={() => {
                setIsProfileOpen(false);
                setIsUserProfileOpen(false);
                setIsLoggedIn(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MessengerApp;
