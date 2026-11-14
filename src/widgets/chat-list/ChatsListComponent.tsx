import React, { useState } from 'react';
import { Inbox, ChevronRight } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { toast } from '@/shared/ui/sonner';
import { useGetCurrentUserQuery } from '@/features/profile';
import { GroupCreateModal, useCreateGroup } from '@/features/groups';
import { QrScannerDialog } from '@/features/auth';
import { useAppWorkerRegistration } from '@/shared/lib/useAppWorkerRegistration';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { ChatListBodySkeleton } from '@/shared/ui/messenger-skeletons';
import ChatsListHeader from './ChatsListHeader';
import ChatListBody from './ui/ChatListBody';
import ChatSearchOverlay from './ui/ChatSearchOverlay';
import ChatContextMenu from './ui/ChatContextMenu';
import { useChatListModel } from './model/useChatListModel';
import { ChatCleanupDialog, useChatCleanup } from '@/features/chat-cleanup';
import type { Chat } from '@/entities/message';
import type { ChatsListComponentProps } from './model/types';
import { selfName } from '@/shared/lib/selfName';
import { AudioPlayerBar } from '@/features/audio-player';

const ChatsListComponent: React.FC<ChatsListComponentProps> = (props) => {
  const { onOpenRequests } = props;
  const model = useChatListModel(props);
  useAppWorkerRegistration(!model.isLoading);
  const { data: me } = useGetCurrentUserQuery();
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [scanning, setScanning] = useState(false);
  const createGroup = useCreateGroup((message, groupName, chatId) => {
    setCreatingGroup(false);
    if (chatId) {
      model.onChatOpen(chatId, groupName, false, 'group');
      toast(message);
    } else {
      model.setModal({ type: 'success', message, confirmText: model.translations.close });
    }
    void model.refetch();
  });
  const pendingRequests = model.requestInbox?.unread_count || 0;
  const cleanup = useChatCleanup((request) => {
    toast(request.kind === 'delete' ? model.translations.chatCleanup.deleted : model.translations.chatCleanup.cleared);
    if (request.kind === 'delete') props.onChatDeleted?.(request.target.chatId);
    void model.refetch();
  }, (message) => model.setModal({ type: 'error', message: message || model.translations.errorLoading }));
  const menuChat = model.chats.find((chat) => chat.id === model.chatContextMenu?.chatId);
  const askCleanup = (kind: 'delete' | 'clear', chat?: Chat) => {
    model.closeChatContextMenu();
    if (!chat) return;
    cleanup.open({ kind, target: {
      chatId: chat.id, name: chat.is_saved ? selfName(chat.display_name || chat.name, model.translations) : chat.display_name || chat.name,
      isGroup: chat.type === 'group', isSaved: !!chat.is_saved, canClearForEveryone: chat.my_role === 'owner' || chat.my_role === 'admin',
    } });
  };
  const openSaved = () => {
    const saved = model.chats.find((chat) => chat.is_saved);
    if (saved) model.handleChatClick(saved);
    else model.onChatOpen(-Date.now(), me?.username || model.username, false, 'one-on-one');
  };
  const header = (
    <ChatsListHeader
      translations={model.translations}
      onOpenSearch={model.handleOpenSearch}
      onNewGroup={() => setCreatingGroup(true)}
      onScanQr={() => setScanning(true)}
      onOpenSaved={openSaved}
    />
  );
  const playerBar = <AudioPlayerBar className={props.activeChatId ? 'md:hidden' : ''} />;

  if (model.isLoading) {
    return (
      <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
        {header}
        <ChatListBodySkeleton />
      </div>
    );
  }

  return (
    <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
      {header}
      {playerBar}
      {pendingRequests > 0 && onOpenRequests && (
        <button type="button" onClick={onOpenRequests}
          className="mx-3 mb-1 mt-2.5 flex items-center gap-3 rounded-xl bg-primary/10 px-3.5 py-3 text-left text-primary transition-colors hover:bg-primary/15 md:hidden">
          <Inbox className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[15px] font-medium">{pendingRequests === 1 ? model.translations.appShell.messageRequestsRowOne
            : fillTemplate(model.translations.appShell.messageRequestsRow, { count: String(pendingRequests) })}</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* Overlay search that covers the chat list area when active */}
      <ChatSearchOverlay
        visible={model.overlayVisible}
        showSearch={model.showSearch}
        circleStyle={model.circleStyle}
        circleActive={model.circleActive}
        translations={model.translations}
        username={model.username}
        oneOnOneChats={model.oneOnOneChatsData?.chats || []}
        onChatOpen={model.onChatOpen}
        onClose={model.handleCloseSearch}
        onCreated={model.refetch}
      />

      {/* Chats list */}
      <ChatListBody
        chats={model.chats}
        activeChatId={props.activeChatId}
        contextChatId={model.chatContextMenu?.chatId}
        translations={model.translations}
        getLastMessagePreview={model.getLastMessagePreview}
        getLastMessageTime={model.getLastMessageTime}
        isOwnLastMessage={model.isOwnLastMessage}
        isOwnLastMessageRead={model.isOwnLastMessageRead}
        onStartChat={model.handleOpenSearch}
        onChatClick={model.handleChatClick}
        onChatContextMenu={model.handleChatContextMenu}
        onOpenChatMenuAt={model.openChatMenuAt}
        onCloseChatMenu={model.closeChatContextMenu}
        onToggleArchived={model.handleToggleArchived}
        onReorderPinned={model.handleReorderPinned}
      />

      <ChatContextMenu
        menu={model.chatContextMenu}
        unreadCount={model.chats.find((chat) => chat.id === model.chatContextMenu?.chatId)?.unread_count || 0}
        translations={model.translations}
        onMarkAsRead={model.handleMarkChatRead}
        onTogglePinned={model.handleTogglePinnedChat}
        onToggleArchived={model.handleToggleArchived}
        onClearHistory={() => askCleanup('clear', menuChat)}
        onDeleteChat={menuChat?.type === 'one-on-one' ? () => askCleanup('delete', menuChat) : undefined}
        canMute={!menuChat?.is_saved}
        onClose={model.closeChatContextMenu}
        onError={(message) => model.setModal({ type: 'error', message })}
      />

      <ChatCleanupDialog request={cleanup.request} onCancel={cleanup.close} onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />

      {creatingGroup && (
        <GroupCreateModal currentUsername={model.username} onClose={() => setCreatingGroup(false)} onCreate={createGroup} />
      )}
      <QrScannerDialog open={scanning} onClose={() => setScanning(false)} />

      {model.modal && (
        <ConfirmModal
          title={model.modal.type === 'success' ? model.translations.success : model.translations.error}
          message={model.modal.message}
          onConfirm={() => {
            model.setModal(null);
            model.modal?.onConfirm?.();
          }}
          onCancel={() => model.setModal(null)}
          confirmText={model.modal.confirmText ?? "OK"}
          hideCancel={model.modal.type === 'success'}
          isError={model.modal.type !== 'success'}
        />
      )}

    </div>
  );
};

export default ChatsListComponent;
