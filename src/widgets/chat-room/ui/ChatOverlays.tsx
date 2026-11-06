import type { SocketSender } from '@/shared/api/realtime';
import type { EntityId } from '@/shared/api/entityId';
import React, { MutableRefObject } from 'react';
import { Message, type MessageSelection } from '@/entities/message';
import { ContextMenu, ReactionMenu, ForwardMessageDialog, Modal, SelectionBar } from '@/features/message-actions';
import { isGoApi } from '@/shared/api/goSocket';

type ContextMenuState = NonNullable<React.ComponentProps<typeof ContextMenu>['contextMenu']>;
type ReactionMenuState = NonNullable<React.ComponentProps<typeof ReactionMenu>['reactionMenu']>;
type ModalState = React.ComponentProps<typeof Modal>['modal'];

interface ChatOverlaysProps {
  contextMenu: ContextMenuState | null;
  reactionMenu: ReactionMenuState | null;
  contextMenuRef: MutableRefObject<HTMLDivElement | null>;
  reactionMenuRef: MutableRefObject<HTMLDivElement | null>;
  messageInputRef: MutableRefObject<HTMLTextAreaElement | null>;
  messages: Message[];
  token: string;
  chatId: EntityId;
  userId: EntityId | null;
  isClosing: boolean;
  wsRef: MutableRefObject<SocketSender | null>;
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
  modal: ModalState;
  selection?: MessageSelection;
  onSelect?: (message: Message) => void;
  onClearSelection: () => void;
}

const mayDeleteForBoth = (userId: EntityId | null) => (message: Message) =>
  !message.system_event && (isGoApi() || !!message.is_own || (userId !== null && message.sender_id === userId));

const ChatOverlays: React.FC<ChatOverlaysProps> = ({
  contextMenu, reactionMenu, contextMenuRef, reactionMenuRef, messageInputRef, messages,
  token, chatId, userId, isClosing, wsRef, setContextMenu, setReactionMenu,
  setEditingMessage, setMessageInput, setReplyTo, setModal, closeMenus, onForward,
  forwardMessage, username, modal, selection, onSelect, onClearSelection,
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
        wsRef={wsRef}
        isClosing={isClosing}
        onClose={closeMenus}
        reactionMenu={reactionMenu}
        setReactionMenu={setReactionMenu}
        messageInputRef={messageInputRef}
        onForward={onForward}
        onSelect={onSelect}
        canDeleteMessage={mayDeleteForBoth(userId)}
        isDirect
      />
    )}
    {reactionMenu && userId !== null && (
      <ReactionMenu
        key={`reaction-${reactionMenu.message.id}`}
        ref={reactionMenuRef}
        reactionMenu={reactionMenu}
        wsRef={wsRef}
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
    />
    <SelectionBar
      chatId={chatId}
      messages={messages}
      selection={selection}
      username={username}
      canDeleteForEveryone={mayDeleteForBoth(userId)}
      isDirect
      onClear={onClearSelection}
    />
    <Modal modal={modal} onClose={() => setModal(null)} />
  </>
);

export default ChatOverlays;
