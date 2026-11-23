import { ChatCoveredContext } from '@/shared/contexts/ChatCoveredContext';
import ProfileComponentRTK, { RecoverySetupPrompt, RecoveryApprovalPrompt, SecurityNoticeHandler, AccountStatusHost } from '@/widgets/profile-panel';
import { isGoApi } from '@/shared/api/goSocket';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/shared/ui/toaster';
import ChatsListComponentRTK from '@/widgets/chat-list';
import { UserProfileComponentRTK, UserProfileLayer } from '@/widgets/profile-panel';
import { AddToPlaylistHost, ReactionBurstHost, startAudioSession } from '@/entities/message';
import { NowPlayingHost } from '@/features/audio-player';
import { useMessengerController } from './model/useMessengerController';
import { chatPanelKey } from './model/messengerRoutes';
import { useVisualViewport, visualViewportStyle } from '@/shared/lib/useVisualViewport';
import { useKeyboardOpen } from '@/shared/lib/useKeyboardOpen';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { WINDOW_MOTION_MS } from '@/shared/ui/windowMotion';
import { DesktopChatLayout } from './ui/DesktopChatLayout';
import { useJumpRequest } from './model/useJumpRequest';
import { QrApprovalRoute } from './ui/QrApprovalRoute';
import { StickerManagerHost, stickerLinkSlug } from '@/features/sticker-packs';
import { EmojiManagerHost, emojiLinkSlug } from '@/features/emoji-packs';
import { PackManager } from '@/widgets/pack-manager';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import { useLocation, useNavigate } from 'react-router-dom';
import { CallProvider, CallStage } from '@/features/calls';
import { Button } from '@/shared/ui/button';
import { DelayedSpinner } from '@/shared/ui/DelayedSpinner';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';
import { MainNav, useMainTab } from '@/widgets/main-nav';
import { MainTabPanes } from './ui/MainTabPanes';

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
    isMeOpen,
    showRouteTab,
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
    openGroupFromProfile,
    handleDirectChatCreated,
    backToChats,
    handleChatDeleted,
    handleCurrentChatDeleted,
    mobileChatPanelClass,
    mobilePanelChat,
  } = useMessengerController(username);

  const profileHandlers = useLatestRef({ closeUserProfile, openDirectChatFromProfile, openGroupFromProfile, handleCurrentChatDeleted });
  const currentUserProfileProps = useMemo(() => ({
    username: profileUsername || currentChat?.name || '',
    directChatId: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name
      ? currentChat.id
      : undefined,
    onClose: () => profileHandlers.current.closeUserProfile(),
    onMessage: (...args: Parameters<typeof openDirectChatFromProfile>) => profileHandlers.current.openDirectChatFromProfile(...args),
    onOpenGroup: (...args: Parameters<typeof openGroupFromProfile>) => profileHandlers.current.openGroupFromProfile(...args),
    hideMessageAction: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name,
    onChatDeleted: currentChat?.type === 'one-on-one' && isPersistedId(currentChat.id) && (profileUsername || currentChat.name) === currentChat.name
      ? () => profileHandlers.current.handleCurrentChatDeleted()
      : undefined,
  }), [profileUsername, currentChat, profileHandlers]);
  const [renderUserProfile, setRenderUserProfile] = useState(isUserProfileOpen);
  const [isUserProfileClosing, setIsUserProfileClosing] = useState(false);
  const { requestJump, requestFor } = useJumpRequest(currentChat?.id);
  const [renderedUserProfileProps, setRenderedUserProfileProps] = useState(currentUserProfileProps);
  useVisualViewport(isMobile);
  const keyboardOpen = useKeyboardOpen(isMobile);
  const [settingsNavTarget, setSettingsNavTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => startAudioSession(), []);
  const mainTab = useMainTab({ routeTab: isProfileOpen ? 'settings' : isMeOpen ? 'profile' : null, showRouteTab });
  const openChatFromList: typeof openChat = (...args) => { mainTab.showChats(); return openChat(...args); };
  const tabPanes = <MainTabPanes tab={mainTab.active} username={username} onShowChats={() => mainTab.select('chats')} onOpenGroup={openGroupFromProfile}
    isEditingProfile={mainTab.isEditingProfile} setEditingProfile={mainTab.setEditingProfile} />;
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

  const userProfileProps = {
    ...renderedUserProfileProps,
    onJumpToMessage: (messageId: EntityId, chatId: EntityId) => {
      requestCloseUserProfile();
      requestJump(chatId, messageId);
      if (String(currentChat?.id) !== String(chatId)) openChatFromList(chatId, renderedUserProfileProps.username, false, 'one-on-one');
    },
    onClose: requestCloseUserProfile,
  };

  const chatListProps = {
    username, onChatOpen: openChatFromList, setIsProfileOpen, onOpenRequests: openMessageRequests, activeChatId: currentChat?.id,
    activeChatName: currentChat?.name, onActiveChatUpdate: updateActiveChatFromList, onChatDeleted: handleChatDeleted,
    hidden: mainTab.active !== 'chats', onJumpToMessage: requestJump,
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
          key={chatPanelKey(mobilePanelChat)}
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
    <ChunkErrorBoundary key={mobilePanelChat.previewKey ?? String(mobilePanelChat.id)} fallback={(
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p role="status">{translations.errorLoading}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{translations.securityPage.retry}</Button>
      </div>
    )}>
      <Suspense fallback={<DelayedSpinner label={translations.loading} className="h-full bg-background" />}>{chatPanel}</Suspense>
    </ChunkErrorBoundary>
  );

  const renderOwnProfile = (layout: 'sheet' | 'pane', embedded = false) => (
    <ProfileComponentRTK
      username={username}
      layout={layout}
      embedded={embedded}
      navTarget={layout === 'pane' ? settingsNavTarget : undefined}
      onClose={() => setIsProfileOpen(false)}
      onLogout={() => {
        setIsProfileOpen(false);
        setIsUserProfileOpen(false);
        onLogout();
      }}
    />
  );

  return (
    <ChatCoveredContext.Provider value={isProfileOpen}>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background">
        <Toaster />
        <AddToPlaylistHost />
        <NowPlayingHost />
        <ReactionBurstHost />
        {isGoApi() && <RecoverySetupPrompt key={username} />}
        {<RecoveryApprovalPrompt key={`approval:${username}`} />}
        {<SecurityNoticeHandler key={`security:${username}`} />}{isGoApi() && <AccountStatusHost key={`moderation:${username}`} />}
        {<CallProvider key={`calls:${username}`} openChatId={currentChat ? String(currentChat.id) : null} />}
        {isGoApi() && <StickerManagerHost linkSlug={stickerLinkSlug(location.pathname)} onLinkClose={() => navigate('/', { replace: true })} />}
        {isGoApi() && <><EmojiManagerHost linkSlug={emojiLinkSlug(location.pathname)} onLinkClose={() => navigate('/', { replace: true })} /><PackManager /></>}
        {qrRequestId && (
          <ChunkErrorBoundary key={qrRequestId}>
            <Suspense fallback={null}>
              <QrApprovalRoute requestId={qrRequestId} onClose={() => navigate('/', { replace: true })} />
            </Suspense>
          </ChunkErrorBoundary>
        )}

        <div className="mx-0 min-h-screen min-w-screen px-0">
          {isMobile ? (
            <div className="fixed inset-x-0 overflow-clip" style={visualViewportStyle}>
              <div className={`absolute inset-x-0 top-0 overflow-hidden bg-background ${
                keyboardOpen ? 'bottom-0' : 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]'}`}>
                <ChatsListComponentRTK {...chatListProps} />
                {tabPanes}
                {isProfileOpen && renderOwnProfile('sheet', true)}
              </div>
              {!keyboardOpen && <MainNav variant="bar" active={mainTab.active} onSelect={mainTab.select} className="absolute inset-x-0 bottom-0" />}

              <div
                className={`absolute inset-0 z-50 overflow-hidden bg-background motion-window-slide ${mobileChatPanelClass}`}
                style={currentChat ? undefined : { pointerEvents: 'none' }}
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
              <MainNav variant="rail" active={mainTab.active} onSelect={mainTab.select} />
              <div className="relative h-full min-w-0 flex-1">
                <DesktopChatLayout resizeLabel={translations.resizeChatList} chatList={<div className="relative h-full">
                  <ChatsListComponentRTK {...chatListProps} />
                  <div ref={setSettingsNavTarget} className="absolute inset-0 z-30 flex rounded-lg bg-background empty:hidden" />
                </div>}>
                  <div className="relative h-full">
                    {activeChat || (
                      <div className="h-full flex items-center justify-center">
                        <div className="bg-muted px-3 py-1 rounded-xl">
                          <p className="text-muted-foreground text-sm">{translations.selectChat}</p>
                        </div>
                      </div>
                    )}
                    {isProfileOpen && renderOwnProfile('pane')}
                    <CallStage />
                  </div>
                </DesktopChatLayout>
                {tabPanes}
              </div>

              {renderUserProfile && (
                <UserProfileLayer isMobile={false} isClosing={isUserProfileClosing} onClose={requestCloseUserProfile}>
                  <UserProfileComponentRTK {...userProfileProps} />
                </UserProfileLayer>
              )}
            </div>
          )}

        </div>
      </div>
    </ChatCoveredContext.Provider>
  );
};

export default MessengerApp;
