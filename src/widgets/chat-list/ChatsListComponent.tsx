import { usePrefetchRecentChats } from './model/usePrefetchRecentChats';
import React, { useState } from 'react';
import { Ban, ChevronRight, Eraser, Flag, Inbox, Trash2 } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { toast } from '@/shared/ui/sonner';
import { useGetCurrentUserQuery } from '@/features/profile';
import { GroupCreateModal, useCreateGroup } from '@/features/groups';
import { QrScannerDialog } from '@/features/auth';
import { useAppWorkerRegistration } from '@/shared/lib/useAppWorkerRegistration';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { DelayedSpinner } from '@/shared/ui/DelayedSpinner';
import ChatsListHeader from './ChatsListHeader';
import ChatListBody from './ui/ChatListBody';
import ChatSearchOverlay from './ui/ChatSearchOverlay';
import ChatContextMenu, { type ChatMenuAction } from './ui/ChatContextMenu';
import { useChatListModel } from './model/useChatListModel';
import { useChatActions, type ChatActionTarget } from '@/features/chat-cleanup';
import { ReportUserDialog } from '@/features/moderation';
import type { Chat } from '@/entities/message';
import type { ChatsListComponentProps } from './model/types';
import { selfName } from '@/shared/lib/selfName';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { plainEmoji } from '@/shared/lib/customEmoji';
import { AudioPlayerBar } from '@/features/audio-player';
import { ImportChatDialog, useImportMe } from '@/features/chat-import';
import { isGoApi } from '@/shared/api/goSocket';

const GROUP_EXIT_MS = 260;

const unreadForMenu = (chat?: Chat) => (chat?.is_request ? 0 : chat?.unread_count || 0);

const ChatsListComponent: React.FC<ChatsListComponentProps> = (props) => {
  const { onOpenRequests } = props;
  const model = useChatListModel(props);
  usePrefetchRecentChats(model.chats);
  useAppWorkerRegistration(!model.isLoading);
  const { data: me } = useGetCurrentUserQuery();
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const importMe = useImportMe();
  const groupModal = useDelayedUnmount(creatingGroup, GROUP_EXIT_MS);
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
  const actions = useChatActions({
    onDeleted: (chatId) => {
      props.onChatDeleted?.(chatId);
      void model.refetch();
    },
    onCleared: () => void model.refetch(),
  });
  const menuChat = model.chats.find((chat) => chat.id === model.chatContextMenu?.chatId);
  const menuActions = (chat?: Chat): ChatMenuAction[] => {
    if (!chat) return [];
    const t = model.translations;
    const target: ChatActionTarget = {
      chatId: chat.id, username: chat.name, isGroup: chat.type === 'group', isSaved: !!chat.is_saved,
      name: plainEmoji(chat.is_saved ? selfName(chat.display_name || chat.name, t) : chat.display_name || chat.name),
      canClearForEveryone: chat.my_role === 'owner' || chat.my_role === 'admin',
    };
    const run = (action: (target: ChatActionTarget) => void) => () => {
      model.closeChatContextMenu();
      action(target);
    };
    const direct = chat.type === 'one-on-one' && !chat.is_saved && !chat.interlocutor_deleted;
    const blocked = direct && actions.isBlocked(chat.name);
    return [
      { key: 'clear', label: t.chatCleanup.clearHistory, icon: <Eraser className="h-4 w-4" />, onSelect: run(actions.openClear) },
      ...(chat.type === 'one-on-one' ? [
        { key: 'delete', label: t.chatCleanup.deleteChat, icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: run(actions.openDelete) },
      ] : []),
      ...(direct ? [
        { key: 'block', label: blocked ? t.blockUser.unblock : t.blockUser.block, icon: <Ban className="h-4 w-4" />, danger: !blocked, onSelect: run(actions.openBlock) },
        { key: 'report', label: t.moderation.report, icon: <Flag className="h-4 w-4" />, danger: true, onSelect: run((value) => void actions.openReport(value)) },
      ] : []),
    ];
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
      onImportChat={importMe && isGoApi() ? () => setImporting(true) : undefined}
    />
  );
  const playerBar = <AudioPlayerBar className={props.activeChatId ? 'md:hidden' : ''} />;

  if (model.isLoading) {
    return (
      <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
        {header}
        <DelayedSpinner label={model.translations.loading} className="flex-1" />
      </div>
    );
  }

  return (
    <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
      {header}
      {playerBar}
      {pendingRequests > 0 && onOpenRequests && (
        <button type="button" onClick={onOpenRequests}
          className="mx-3 mb-1 mt-2.5 flex items-center gap-3 rounded-xl bg-primary/10 px-3.5 py-3 text-left text-primary transition-colors hover:bg-primary/15">
          <Inbox className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[15px] font-medium">{pendingRequests === 1 ? model.translations.appShell.messageRequestsRowOne
            : fillTemplate(model.translations.appShell.messageRequestsRow, { count: String(pendingRequests) })}</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}

      <ChatSearchOverlay
        visible={model.overlayVisible}
        showSearch={model.showSearch}
        circleStyle={model.circleStyle}
        circleActive={model.circleActive}
        translations={model.translations}
        language={model.language}
        username={model.username}
        currentUserId={me?.id}
        chats={model.chats}
        activeChatId={props.activeChatId}
        oneOnOneChats={model.oneOnOneChatsData?.chats || []}
        onChatOpen={model.onChatOpen}
        onChatClick={model.handleChatClick}
        onJumpToMessage={props.onJumpToMessage}
        onClose={model.handleCloseSearch}
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
        unreadCount={unreadForMenu(model.chats.find((chat) => chat.id === model.chatContextMenu?.chatId))}
        translations={model.translations}
        onMarkAsRead={model.handleMarkChatRead}
        onTogglePinned={model.handleTogglePinnedChat}
        onToggleArchived={model.handleToggleArchived}
        actions={menuActions(menuChat)}
        canMute={!menuChat?.is_saved}
        onClose={model.closeChatContextMenu}
        onError={(message) => model.setModal({ type: 'error', message })}
      />

      {actions.dialogs}
      {actions.reporting && <ReportUserDialog userId={actions.reporting.userId} name={actions.reporting.name} onClose={actions.closeReport} />}

      {groupModal.mounted && (
        <GroupCreateModal currentUsername={model.username} closing={groupModal.closing} onClose={() => setCreatingGroup(false)} onCreate={createGroup} />
      )}
      <QrScannerDialog open={scanning} onClose={() => setScanning(false)} />
      {importMe && <ImportChatDialog open={importing} onOpenChange={setImporting} me={importMe} />}

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
