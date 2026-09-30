import React from 'react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import UserProfileComponentRTK from '@/widgets/profile-panel/UserProfileComponentRTK';
import { ChatListBodySkeleton } from '@/shared/ui/messenger-skeletons';
import ChatsListHeader from './ChatsListHeader';
import ChatListBody from './ui/ChatListBody';
import ChatSearchOverlay from './ui/ChatSearchOverlay';
import ChatContextMenu from './ui/ChatContextMenu';
import { useChatListModel } from './model/useChatListModel';
import type { ChatsListComponentProps } from './model/types';

const ChatsListComponent: React.FC<ChatsListComponentProps> = (props) => {
  const { setIsProfileOpen } = props;
  const model = useChatListModel(props);

  if (model.isLoading) {
    return (
      <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
        <ChatsListHeader
          translations={model.translations}
          onOpenSearch={model.handleOpenSearch}
          profileIndicatorCount={model.requestInbox?.unread_count || 0}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        <ChatListBodySkeleton />
      </div>
    );
  }

  return (
    <div ref={model.containerRef} className="h-full bg-background text-foreground flex flex-col relative">
      {/* Header */}
      <ChatsListHeader
        translations={model.translations}
        onOpenSearch={model.handleOpenSearch}
        profileIndicatorCount={model.requestInbox?.unread_count || 0}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

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
        translations={model.translations}
        getLastMessagePreview={model.getLastMessagePreview}
        getLastMessageTime={model.getLastMessageTime}
        isOwnLastMessage={model.isOwnLastMessage}
        isOwnLastMessageRead={model.isOwnLastMessageRead}
        onChatClick={model.handleChatClick}
        onChatContextMenu={model.handleChatContextMenu}
      />

      <ChatContextMenu
        menu={model.chatContextMenu}
        unreadCount={model.chats.find((chat) => chat.id === model.chatContextMenu?.chatId)?.unread_count || 0}
        translations={model.translations}
        onMarkAsRead={model.handleMarkChatRead}
        onTogglePinned={model.handleTogglePinnedChat}
      />

      {/* Modals */}
      {model.modal && (
        <ConfirmModal
          title={model.modal.type === 'success' ? model.translations.success : model.translations.error}
          message={model.modal.message}
          onConfirm={model.modal.onConfirm || (() => model.setModal(null))}
          onCancel={() => model.setModal(null)}
          confirmText="OK"
          isError={model.modal.type !== 'success'}
        />
      )}

      {model.selectedUser && (
        <UserProfileComponentRTK
          username={model.selectedUser}
          onClose={() => model.setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default ChatsListComponent;
