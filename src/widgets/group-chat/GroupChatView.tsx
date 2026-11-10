import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { isPersistedId } from '@/shared/api/entityId';
import React, { useState } from 'react';
import { ChatHeaderSearch, type Message, type ReactionInfo } from '@/entities/message';
import { unescapeCurlyBraces } from '@/features/chat-core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { MessageList } from '@/features/message-list';
import { ImageDrawingProvider } from '@/features/image-drawing';
import { MessageComposer } from '@/features/message-composer';
import { useStableCallback } from '@/shared/lib/useStableCallback';
import { ContextMenu, ReactionMenu, Modal, ForwardMessageDialog, SelectionBar, useMessageSelection, useReplyAction } from '@/features/message-actions';
import { useBackToClose } from '@/shared/lib/useBackToClose';
import GroupProfileDialog from './GroupProfileDialog';
import GroupChatHeader from './GroupChatHeader';

import type { GroupChatViewModel } from './groupChatTypes';
import { useElementHeight } from '@/shared/lib/useElementHeight';

const renderMessageContent = (message: Message) => message.type === 'message' && typeof message.content === 'string'
  ? unescapeCurlyBraces(message.content)
  : undefined;

const GroupChatView: React.FC<{ model: GroupChatViewModel }> = ({ model }) => {
  const [composerRef, composerHeight] = useElementHeight<HTMLDivElement>();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const {
     onBack, openGroupProfile, currentGroupAvatar, currentGroupName, groupDetails, translations, messages,
     username, currentUserId, firstUnreadMessageId, handleMessageClick, handleOpenUserProfile, handleOpenMemberProfile,
     highlightedMessageId, contextMenu, getFormattedDateLabel, getMessageTime, messageRefs, canDeleteMessage,
     jumpToSearchResult, scrollToMessage, wsRef, openMenus, tempHighlightedMessageId,
     setTempHighlightedMessageId, loadOlderMessages, hasMoreMessages, isLoadingOlderMessages,
     isLoadingInitialMessages, loadNewerMessages, loadLatestMessages, hasMoreNewerMessages,
     isLoadingNewerMessages, markMessagesRead, isOwnMessage, setReadStatusMessage, setReactionDetails, chatId,
     closeMenus, reactionMenu, messageInputRef, composerDraftRef, setMessageInput, replyTo, editingMessage,
     handleSendMessage, handleSendSticker, handleFileUpload, handleResendMessage, setReplyTo, setEditingMessage, token,
     createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed,
     settleOptimisticUpload, contextMenuRef, setContextMenu, setModal, isClosing, setForwardMessage,
     reactionMenuRef, setReactionMenu, renderGroupProfile, isGroupProfileClosing, requestCloseGroupProfile,
     groupForm, setGroupForm, participantInput, setParticipantInput, isSavingGroup, groupAvatarInputRef,
     getAvatarSrc, handleGroupAvatarUpload, handleSaveGroup, handleAddParticipant, handleRemoveParticipant,
     handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup, groupConfirm, setGroupConfirm,
     unreadParticipants, readStatusMessage, reactionDetails, modal, forwardMessage,
  } = model;
  const { selection, start: startSelection, clear: clearSelection, intercept } = useMessageSelection(chatId, messages);
  useBackToClose(selection.active, clearSelection, 'selection');
  useBackToClose(isSearchOpen, () => setIsSearchOpen(false), 'search');
  const startReply = useReplyAction({ setReplyTo, setEditingMessage, setMessageInput, messageInputRef });
  const onListMessageClick = useStableCallback(intercept(handleMessageClick));
  const onListAvatarClick = useStableCallback(handleOpenUserProfile);
  const onListReactionMenu = useStableCallback((message: Message, event: React.MouseEvent) => openMenus(message, event));
  const onListReadStatus = useStableCallback((message: Message) => { if (isOwnMessage(message)) setReadStatusMessage(message); });
  const onListReactionDetails = useStableCallback((message: Message, reaction: string, reactions: ReactionInfo[]) => (
    setReactionDetails({ message, reaction, reactions })
  ));
  const onListResend = useStableCallback(handleResendMessage);
  const onListScrollStart = useStableCallback(() => { if (contextMenu || reactionMenu) closeMenus(); });
  return (
    <div data-chat-drop-zone data-chat-id={String(chatId)} className="relative flex h-full flex-col overflow-hidden">
      {isSearchOpen ? (
        <ChatHeaderSearch chatId={chatId} onClose={() => setIsSearchOpen(false)} onJumpToMessage={jumpToSearchResult} />
      ) : (
      <GroupChatHeader chatId={chatId} name={currentGroupName} avatar={currentGroupAvatar} participantCount={groupDetails?.participants.length || 0}
        description={groupDetails?.description} translations={translations} onBack={onBack} onOpenProfile={openGroupProfile}
        onOpenSearch={isPersistedId(chatId) ? () => setIsSearchOpen(true) : undefined} />
      )}

      <ImageDrawingProvider chatId={chatId} enabled={isPersistedId(chatId)} onSent={settleOptimisticUpload}>
      <MessageList
        chatId={chatId}
        messages={messages}
        username={username}
        userId={currentUserId}
        interlocutorDeleted={false}
        firstUnreadMessageId={firstUnreadMessageId}
        onMessageClick={onListMessageClick}
        onAvatarClick={onListAvatarClick}
        highlightedMessageId={highlightedMessageId}
        contextMenuMessageId={contextMenu?.messageId}
        composerTargetMessageId={(editingMessage || replyTo)?.id}
        bottomInset={composerHeight}
        getFormattedDateLabel={getFormattedDateLabel}
        getMessageTime={getMessageTime}
        renderMessageContent={renderMessageContent}
        messageRefs={messageRefs}
        onReplyClick={scrollToMessage}
        wsRef={wsRef}
        onOpenReactionMenu={onListReactionMenu}
        tempHighlightedMessageId={tempHighlightedMessageId}
        setTempHighlightedMessageId={setTempHighlightedMessageId}
        onLoadOlderMessages={loadOlderMessages}
        onLoadNewerMessages={loadNewerMessages}
        onLoadLatestMessages={loadLatestMessages}
        hasMoreNewerMessages={hasMoreNewerMessages}
        isLoadingNewerMessages={isLoadingNewerMessages}
        onMarkMessagesRead={markMessagesRead}
        onResendMessage={onListResend}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        isLoadingInitialMessages={isLoadingInitialMessages}
        isGroup
        onOpenReadStatus={onListReadStatus}
        onOpenReactionDetails={onListReactionDetails}
        scrollToBottomKey={chatId}
        selection={selection} onSwipeReply={startReply}
        onScrollStart={onListScrollStart}
      />
      </ImageDrawingProvider>

      <div ref={composerRef} className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 motion-composer ${selection.active || isSearchOpen ? 'is-hidden' : ''}`}>
        <MessageComposer
          ref={messageInputRef}
          draftRef={composerDraftRef}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessage}
          onSendSticker={handleSendSticker}
          onFileUpload={handleFileUpload}
          onCancelReplyOrEdit={() => {
            setReplyTo(null);
            setEditingMessage(null);
            setMessageInput('');
          }}
          chatId={chatId}
          token={token}
          onVoiceUploadStart={createOptimisticUploadMessage}
          onVoiceUploadProgress={updateOptimisticUploadProgress}
          onVoiceUploadError={markOptimisticUploadFailed}
          onVoiceUploadComplete={settleOptimisticUpload}
        />
      </div>

      {contextMenu && isPersistedId(currentUserId) && (
        <ContextMenu
          ref={contextMenuRef}
          contextMenu={contextMenu}
          messages={messages}
          token={token}
          chatId={chatId}
          userId={currentUserId}
          setContextMenu={setContextMenu}
          setEditingMessage={setEditingMessage}
          setMessageInput={setMessageInput}
          setReplyTo={setReplyTo}
          setModal={setModal}
          wsRef={wsRef}
          isClosing={isClosing}
          onClose={closeMenus}
          reactionMenu={reactionMenu}
          setReactionMenu={setReactionMenu}
          messageInputRef={messageInputRef}
          canDeleteMessage={canDeleteMessage}
          onForward={setForwardMessage}
          onSelect={startSelection}
        />
      )}

      {reactionMenu && isPersistedId(currentUserId) && (
        <ReactionMenu
          ref={reactionMenuRef}
          reactionMenu={reactionMenu}
          wsRef={wsRef}
          userId={currentUserId}
          setReactionMenu={setReactionMenu}
          onClose={closeMenus}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          contextMenuRef={contextMenuRef}
        />
      )}

      <GroupProfileDialog
        open={renderGroupProfile}
        isClosing={isGroupProfileClosing}
        onOpenChange={(nextOpen) => (nextOpen ? openGroupProfile() : requestCloseGroupProfile())}
        onJumpToMessage={(messageId) => { requestCloseGroupProfile(); jumpToSearchResult(messageId); }}
        chatId={chatId}
        groupDetails={groupDetails}
        currentGroupName={currentGroupName}
        currentGroupAvatar={currentGroupAvatar}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        participantInput={participantInput}
        setParticipantInput={setParticipantInput}
        isSavingGroup={isSavingGroup}
        currentUsername={username}
        groupAvatarInputRef={groupAvatarInputRef}
        getAvatarSrc={getAvatarSrc}
        onAvatarUpload={handleGroupAvatarUpload}
        onSaveGroup={handleSaveGroup}
        onAddParticipant={handleAddParticipant}
        onRemoveParticipant={handleRemoveParticipant}
        onRoleChange={handleRoleChange}
        onTransferOwner={handleTransferOwner}
        onLeaveGroup={handleLeaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenUserProfile={handleOpenMemberProfile}
        groupConfirm={groupConfirm}
        onCloseGroupConfirm={() => setGroupConfirm(null)}
      />

      <Dialog open={!!readStatusMessage} onOpenChange={(open) => !open && setReadStatusMessage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translations.readStatus || 'Read status'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium">{translations.readBy || 'Read by'}</h3>
              {(readStatusMessage?.read_by || []).length > 0 ? (
                <div className="space-y-2">
                  {readStatusMessage?.read_by.map((read) => (
                    <button key={read.user_id} type="button" onClick={() => read.username && handleOpenUserProfile(read.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                      <AuthenticatedImage src={getAvatarSrc(read.avatar_url)} alt={read.display_name || read.username || ''} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{read.display_name || read.username}</div>
                        {read.username && <div className="truncate text-xs text-muted-foreground">@{read.username}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{translations.noReadsYet || 'No reads yet'}</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">{translations.notReadYet || 'Not read yet'}</h3>
              {unreadParticipants.length > 0 ? (
                <div className="space-y-2">
                  {unreadParticipants.map((participant) => (
                    <button key={participant.id} type="button" onClick={() => handleOpenUserProfile(participant.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                      <AuthenticatedImage src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{participant.display_name || participant.username}</div>
                        <div className="truncate text-xs text-muted-foreground">@{participant.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{translations.everyoneRead || 'Everyone has read this message'}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reactionDetails} onOpenChange={(open) => !open && setReactionDetails(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{reactionDetails?.reaction} {translations.reactions || 'Reactions'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {reactionDetails?.reactions.map((reaction) => (
              <button key={`${reaction.user_id}-${reaction.reaction}`} type="button" onClick={() => reaction.username && handleOpenUserProfile(reaction.username)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                <AuthenticatedImage src={getAvatarSrc(reaction.avatar_url)} alt={reaction.display_name || reaction.username || ''} className="h-8 w-8 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{reaction.display_name || reaction.username}</div>
                  {reaction.username && <div className="truncate text-xs text-muted-foreground">@{reaction.username}</div>}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Modal modal={modal} onClose={() => setModal(null)} />
      <SelectionBar chatId={chatId} messages={messages} selection={selection} username={username} canDeleteForEveryone={canDeleteMessage}
        onClear={clearSelection} />
      <ForwardMessageDialog
        open={!!forwardMessage}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
        message={forwardMessage}
        username={username}
      />
    </div>
  );
};

export default GroupChatView;
