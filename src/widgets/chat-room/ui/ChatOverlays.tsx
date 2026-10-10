import type { ChatRealtime } from '@/shared/api/realtime';
import React, { MutableRefObject } from 'react';
import { Message } from '@/entities/message';
import { ContextMenu, ReactionMenu, ForwardMessageDialog, Modal } from '@/features/message-actions';
import type { Id } from '@/shared/lib/ids';

type ContextMenuState = NonNullable<React.ComponentProps<typeof ContextMenu>['contextMenu']>;
type ReactionMenuState = NonNullable<React.ComponentProps<typeof ReactionMenu>['reactionMenu']>;
type ModalState = React.ComponentProps<typeof Modal>['modal'];

interface ChatOverlaysProps {
  contextMenu: ContextMenuState | null;
  reactionMenu: ReactionMenuState | null;
  contextMenuRef: MutableRefObject<HTMLDivElement | null>;
  reactionMenuRef: MutableRefObject<HTMLDivElement | null>;
  messageInputRef: MutableRefObject<HTMLInputElement | null>;
  messages: Message[];
  token: string;
  chatId: Id;
  userId: Id | null;
  isClosing: boolean;
  chatRealtime: ChatRealtime;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setReactionMenu: (menu: ReactionMenuState | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (input: string) => void;
  setReplyTo: (message: Message | null) => void;
  setModal: (modal: ModalState) => void;
  closeMenus: () => void;
  onForward: (message: Message | null) => void;
  forwardMessage: Message | null;
  username: string;
  onForwarded: () => void;
  modal: ModalState;
}

const ChatOverlays: React.FC<ChatOverlaysProps> = ({
  contextMenu, reactionMenu, contextMenuRef, reactionMenuRef, messageInputRef, messages,
  token, chatId, userId, isClosing, chatRealtime, setContextMenu, setReactionMenu,
  setEditingMessage, setMessageInput, setReplyTo, setModal, closeMenus, onForward,
  forwardMessage, username, onForwarded, modal,
}) => (
  <>
    {contextMenu && userId !== null && (
      <ContextMenu
        key={`context-${contextMenu.messageId}`}
        ref={contextMenuRef}
        contextMenu={contextMenu}
        messages={messages}
        token={token}
        chatId={chatId}
        userId={userId}
        setContextMenu={setContextMenu}
        setEditingMessage={setEditingMessage}
        setMessageInput={setMessageInput}
        setReplyTo={setReplyTo}
        setModal={setModal}
        chatRealtime={chatRealtime}
        isClosing={isClosing}
        onClose={closeMenus}
        reactionMenu={reactionMenu}
        setReactionMenu={setReactionMenu}
        messageInputRef={messageInputRef}
        onForward={onForward}
      />
    )}
    {reactionMenu && userId !== null && (
      <ReactionMenu
        key={`reaction-${reactionMenu.message.id}`}
        ref={reactionMenuRef}
        reactionMenu={reactionMenu}
        chatRealtime={chatRealtime}
        userId={userId}
        setReactionMenu={setReactionMenu}
        onClose={closeMenus}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        contextMenuRef={contextMenuRef}
      />
    )}
    <ForwardMessageDialog
      open={!!forwardMessage}
      onOpenChange={(open) => { if (!open) onForward(null); }}
      message={forwardMessage}
      username={username}
      onForwarded={onForwarded}
    />
    <Modal modal={modal} onClose={() => setModal(null)} />
  </>
);

export default ChatOverlays;
