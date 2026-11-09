import { RecoverySetupPrompt, RecoveryApprovalPrompt, SecurityNoticeHandler } from '@/widgets/profile-panel';
import { isGoApi } from '@/shared/api/goSocket';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import ChatsListComponentRTK from '@/widgets/chat-list';
import ProfileComponentRTK from '@/widgets/profile-panel';
import { UserProfileComponentRTK, UserProfileLayer } from '@/widgets/profile-panel';
import { useMessengerController } from './model/useMessengerController';
import { useVisualViewport, visualViewportStyle } from '@/shared/lib/useVisualViewport';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { DesktopChatLayout } from './ui/DesktopChatLayout';
import { useJumpRequest } from './model/useJumpRequest';
import { QrApprovalRoute } from './ui/QrApprovalRoute';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import { useLocation, useNavigate } from 'react-router-dom';
import { CallProvider, CallStage } from '@/features/calls';
import { Button } from '@/shared/ui/button';
import { ChatRoomSkeleton } from '@/shared/ui/messenger-skeletons';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';

const Chat = lazy(() => import('@/widgets/chat-room'));
const GroupComponent = lazy(() => import('@/widgets/group-chat'));

interface MessengerAppProps {
  username: string;
  onLogout: () => void;
}

const MessengerApp = ({ username, onLogout }: MessengerAppProps) => {
  const {
    currentChat,
    isProfileOpen,
    setIsProfileOpen,
    openMessageRequests,
    isUserProfileOpen,
    setIsUserProfileOpen,
    profileUsername,
    isMobile,
    translations,
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
  } = useMessengerController(username);

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
  useVisualViewport(isMobile);
  const ownProfile = useDelayedUnmount(isProfileOpen, WINDOW_MOTION_MS);
  const location = useLocation();
  const navigate = useNavigate();
  const qrRequestId = qrLoginRequestId(location.pathname);

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

  const chatPanel = mobilePanelChat
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

  const activeChat = mobilePanelChat && (
    <ChunkErrorBoundary key={mobilePanelChat.id} fallback={(
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p role="status">{translations.errorLoading}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{translations.securityPage.retry}</Button>
      </div>
    )}>
      <Suspense fallback={<ChatRoomSkeleton />}>{chatPanel}</Suspense>
    </ChunkErrorBoundary>
  );

  const renderOwnProfile = (layout: 'sheet' | 'pane') => (
    <ProfileComponentRTK
      username={username}
      layout={layout}
      isClosing={ownProfile.closing}
      onClose={() => setIsProfileOpen(false)}
      onLogout={() => {
        setIsProfileOpen(false);
        setIsUserProfileOpen(false);
        onLogout();
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background">
      <Toaster />
      {isGoApi() && <RecoverySetupPrompt key={username} />}
      {<RecoveryApprovalPrompt key={`approval:${username}`} />}
      {<SecurityNoticeHandler key={`security:${username}`} />}
      {<CallProvider key={`calls:${username}`} openChatId={currentChat ? String(currentChat.id) : null} />}
      {qrRequestId && (
        <ChunkErrorBoundary key={qrRequestId}>
          <Suspense fallback={null}>
            <QrApprovalRoute requestId={qrRequestId} onClose={() => navigate('/', { replace: true })} />
          </Suspense>
        </ChunkErrorBoundary>
      )}

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
    </div>
  );
};

export default MessengerApp;
