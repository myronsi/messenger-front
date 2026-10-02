import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Message } from '@/entities/message';
import { unescapeCurlyBraces } from '@/features/chat-core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import MessageList from '@/widgets/chat-room/ui/MessageList';
import MessageInput from '@/widgets/chat-room/ui/MessageInput';
import ContextMenu from '@/widgets/chat-room/ui/ContextMenu';
import ReactionMenu from '@/widgets/chat-room/ui/ReactionMenu';
import Modal from '@/widgets/chat-room/ui/Modal';
import ForwardMessageDialog from '@/widgets/chat-room/ui/ForwardMessageDialog';
import GroupProfileDialog from './GroupProfileDialog';

import type { GroupChatViewModel } from './groupChatTypes';

const GroupChatView: React.FC<{ model: GroupChatViewModel }> = ({ model }) => {
  const renderMessageContent = (message: Message) => message.type === 'message' && typeof message.content === 'string'
    ? <div className="whitespace-pre-wrap break-words">{unescapeCurlyBraces(message.content)}</div>
    : <div />;
  const { onBack, openGroupProfile, currentGroupAvatar, currentGroupName, groupDetails, translations, messages, username, currentUserId, firstUnreadMessageId, handleMessageClick, handleOpenUserProfile, highlightedMessageId, contextMenu, getFormattedDateLabel, getMessageTime, messageRefs, canDeleteMessage, jumpToSearchResult, setHighlightedMessageId, scrollToMessage, wsRef, openMenus, tempHighlightedMessageId, setTempHighlightedMessageId, loadOlderMessages, hasMoreMessages, isLoadingOlderMessages, isLoadingInitialMessages, loadNewerMessages, hasMoreNewerMessages, isLoadingNewerMessages, markMessagesRead, isOwnMessage, setReadStatusMessage, setReactionDetails, chatId, closeMenus, reactionMenu, messageInputRef, messageInput, setMessageInput, replyTo, editingMessage, handleSendMessage, handleFileUpload, handleResendMessage, setReplyTo, setEditingMessage, token, createOptimisticUploadMessage, updateOptimisticUploadProgress, markOptimisticUploadFailed, settleOptimisticUpload, contextMenuRef, setContextMenu, setModal, isClosing, setForwardMessage, reactionMenuRef, setReactionMenu, renderGroupProfile, isGroupProfileClosing, requestCloseGroupProfile, groupForm, setGroupForm, participantInput, setParticipantInput, isSavingGroup, groupAvatarInputRef, getAvatarSrc, handleGroupAvatarUpload, handleSaveGroup, handleAddParticipant, handleRemoveParticipant, handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup, groupConfirm, setGroupConfirm, unreadParticipants, readStatusMessage, reactionDetails, modal, forwardMessage } = model;
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="motion-panel-in flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center space-x-4">
          <button onClick={onBack} className="motion-press rounded-full p-2 transition-colors hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={openGroupProfile}
            className="motion-press flex min-w-0 items-center space-x-2 rounded-lg px-1 py-1 text-left outline-none focus:outline-none"
          >
            <img src={currentGroupAvatar} alt={currentGroupName} className="motion-avatar h-9 w-9 rounded-full border border-gray-200 object-cover" />
            <span className="flex min-w-0 flex-col items-start">
              <span className="max-w-[52vw] truncate text-base font-semibold leading-tight sm:max-w-none sm:text-lg">{currentGroupName}</span>
              <span className="max-w-[52vw] truncate text-xs font-normal text-muted-foreground sm:max-w-none">
                {groupDetails?.participants.length || 0} {translations.participants || 'participants'}
                {groupDetails?.description ? ` - ${groupDetails.description}` : ''}
              </span>
            </span>
          </button>
        </div>
      </div>

      <MessageList
        messages={messages}
        username={username}
        userId={currentUserId}
        interlocutorDeleted={false}
        firstUnreadMessageId={firstUnreadMessageId}
        onMessageClick={handleMessageClick}
        onAvatarClick={handleOpenUserProfile}
        highlightedMessageId={highlightedMessageId}
        contextMenuMessageId={contextMenu?.messageId}
        getFormattedDateLabel={getFormattedDateLabel}
        getMessageTime={getMessageTime}
        renderMessageContent={renderMessageContent}
        messageRefs={messageRefs}
        onReplyClick={scrollToMessage}
        wsRef={wsRef}
        onOpenReactionMenu={(message, event) => openMenus(message, event)}
        tempHighlightedMessageId={tempHighlightedMessageId}
        setTempHighlightedMessageId={setTempHighlightedMessageId}
        onLoadOlderMessages={loadOlderMessages}
        onLoadNewerMessages={loadNewerMessages}
        hasMoreNewerMessages={hasMoreNewerMessages}
        isLoadingNewerMessages={isLoadingNewerMessages}
        onMarkMessagesRead={markMessagesRead}
        onResendMessage={handleResendMessage}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        isLoadingInitialMessages={isLoadingInitialMessages}
        isGroup
        onOpenReadStatus={(message) => {
          if (isOwnMessage(message)) setReadStatusMessage(message);
        }}
        onOpenReactionDetails={(message, reaction, reactions) => setReactionDetails({ message, reaction, reactions })}
        scrollToBottomKey={chatId}
        onScrollStart={() => {
          if (!contextMenu && !reactionMenu) return;
          closeMenus();
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <MessageInput
          ref={messageInputRef}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessage}
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

      {contextMenu && currentUserId > 0 && (
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
        />
      )}

      {reactionMenu && currentUserId > 0 && (
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
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openGroupProfile();
          } else {
            requestCloseGroupProfile();
          }
        }}
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
        onOpenUserProfile={handleOpenUserProfile}
        onJumpToMessage={(messageId) => {
          requestCloseGroupProfile();
          jumpToSearchResult(messageId);
        }}
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
                      <img src={getAvatarSrc(read.avatar_url)} alt={read.display_name || read.username || ''} className="h-8 w-8 rounded-full object-cover" />
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
                      <img src={getAvatarSrc(participant.avatar_url)} alt={participant.username} className="h-8 w-8 rounded-full object-cover" />
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
                <img src={getAvatarSrc(reaction.avatar_url)} alt={reaction.display_name || reaction.username || ''} className="h-8 w-8 rounded-full object-cover" />
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
      <ForwardMessageDialog
        open={!!forwardMessage}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
        message={forwardMessage}
        username={username}
        onForwarded={() => setModal({ type: 'copy', message: translations.messageForwarded || 'Message forwarded' })}
      />
    </div>
  );
};

export default GroupChatView;
