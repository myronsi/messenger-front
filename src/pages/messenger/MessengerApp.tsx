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
import { Button } from '@/shared/ui/button';
import { useVisualViewport, visualViewportStyle } from '@/shared/lib/useVisualViewport';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { DesktopChatLayout } from './ui/DesktopChatLayout';
import { useJumpRequest } from './model/useJumpRequest';
import { QrApprovalRoute } from './ui/QrApprovalRoute';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import { useLocation, useNavigate } from 'react-router-dom';
import { pathOutsideAuth } from '@/shared/lib/authPaths';
import { notificationReturnPath } from '@/shared/lib/notifications/navigation';
import { CallProvider, CallStage } from '@/features/calls';

interface MessengerAppProps {
  renderAuthPage: (props: { onLoginSuccess: (username: string) => void }) => ReactNode;
}

const SessionLoading = ({ label, retryLabel }: { label: string; retryLabel: string }) => {
  const [canRetry, setCanRetry] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setCanRetry(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <p role="status" className="text-sm text-muted-foreground">{label}</p>
      {canRetry && <Button variant="outline" onClick={() => window.location.reload()}>{retryLabel}</Button>}
    </main>
  );
};

const MessengerApp = ({ renderAuthPage }: MessengerAppProps) => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    username,
    currentChat,
    isProfileOpen,
    setIsProfileOpen,
    openMessageRequests,
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
  const ownProfile = useDelayedUnmount(isProfileOpen, WINDOW_MOTION_MS);
  const location = useLocation();
  const navigate = useNavigate();
  const qrRequestId = qrLoginRequestId(location.pathname);

  useEffect(() => {
    const target = isLoggedIn ? pathOutsideAuth(window.location.pathname) : null;
    if (target === null) return;
    navigate(target === '/' ? notificationReturnPath(location.pathname, location.search, location.state) : target, { replace: true });
  }, [isLoggedIn, location.pathname, location.search, location.state, navigate]);

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
    }, WINDOW_MOTION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [currentChat, currentUserProfileProps, isUserProfileOpen, profileUsername, renderUserProfile]);

  const requestCloseUserProfile = () => {
    if (isUserProfileClosing) return;
    setIsUserProfileClosing(true);
    window.setTimeout(() => {
      closeUserProfile();
    }, WINDOW_MOTION_MS);
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

  const renderOwnProfile = (layout: 'sheet' | 'pane') => (
    <ProfileComponentRTK
      username={username}
      layout={layout}
      isClosing={ownProfile.closing}
      onClose={() => setIsProfileOpen(false)}
      onLogout={() => {
        setIsProfileOpen(false);
        setIsUserProfileOpen(false);
        setIsLoggedIn(false);
      }}
    />
  );

  if (isLoading) {
    return <SessionLoading label={translations.authLayout.checkingSession} retryLabel={translations.securityPage.retry} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background">
      <Toaster />
      {isLoggedIn && isGoApi() && <RecoverySetupPrompt key={username} />}
      {isLoggedIn && <RecoveryApprovalPrompt key={`approval:${username}`} />}
      {isLoggedIn && <SecurityNoticeHandler key={`security:${username}`} />}
      {isLoggedIn && <CallProvider key={`calls:${username}`} openChatId={currentChat ? String(currentChat.id) : null} />}
      {isLoggedIn && qrRequestId && <QrApprovalRoute key={qrRequestId} requestId={qrRequestId} onClose={() => navigate('/', { replace: true })} />}

      {!isLoggedIn ? (
        renderAuthPage({ onLoginSuccess: handleLoginSuccess })
      ) : (
        <div className="mx-0 min-h-screen min-w-screen px-0">
          {isMobile ? (
            <div className="fixed inset-x-0 overflow-hidden" style={visualViewportStyle}>
              <div className="absolute inset-0 overflow-hidden bg-background">
                <ChatsListComponentRTK
                  username={username}
                  onChatOpen={openChat}
                  setIsProfileOpen={setIsProfileOpen}
                  onOpenRequests={openMessageRequests}
                  activeChatId={currentChat?.id}
                  activeChatName={currentChat?.name}
                  onActiveChatUpdate={updateActiveChatFromList}
                  onChatDeleted={handleChatDeleted}
                />
              </div>

              <div
                className={`absolute inset-0 z-50 overflow-hidden bg-background motion-window-slide ${mobileChatPanelClass}`}
                style={{ pointerEvents: currentChat ? 'auto' : 'none' }}
              >
                {activeChat || (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">{translations.selectChat}</p>
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
                  onOpenRequests={openMessageRequests}
                  activeChatId={currentChat?.id}
                  activeChatName={currentChat?.name}
                  onActiveChatUpdate={updateActiveChatFromList}
                  onChatDeleted={handleChatDeleted}
                />
              }>
                <div className="relative h-full">
                  {activeChat || (
                    <div className="h-full flex items-center justify-center">
                      <div className="bg-muted px-3 py-1 rounded-xl">
                        <p className="text-muted-foreground text-sm">{translations.selectChat}</p>
                      </div>
                    </div>
                  )}
                  {ownProfile.mounted && renderOwnProfile('pane')}
                  <CallStage />
                </div>
              </DesktopChatLayout>

              {renderUserProfile && (
                <UserProfileLayer isMobile={false} isClosing={isUserProfileClosing} onClose={requestCloseUserProfile}>
                  <UserProfileComponentRTK {...userProfileProps} />
                </UserProfileLayer>
              )}
            </div>
          )}

          {isMobile && ownProfile.mounted && renderOwnProfile('sheet')}
        </div>
      )}
    </div>
  );
};

export default MessengerApp;
