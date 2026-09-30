import React, { MutableRefObject } from 'react';
import { Message } from '@/entities/message';
import ContextMenu from './ContextMenu';
import ReactionMenu from './ReactionMenu';
import MessageSearchDialog from './MessageSearchDialog';
import ForwardMessageDialog from './ForwardMessageDialog';
import Modal from './Modal';

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
  chatId: number;
  userId: number | null;
  isClosing: boolean;
  wsRef: MutableRefObject<WebSocket | null>;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setReactionMenu: (menu: ReactionMenuState | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (input: string) => void;
  setReplyTo: (message: Message | null) => void;
  setModal: (modal: ModalState) => void;
  closeMenus: () => void;
  onForward: (message: Message | null) => void;
  onDeleteForMe: (messageId: number) => Promise<unknown>;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  getMessageTime: (timestamp: string) => string;
  jumpToSearchResult: (messageId: number) => void;
  forwardMessage: Message | null;
  username: string;
  onForwarded: () => void;
  modal: ModalState;
}

const ChatOverlays: React.FC<ChatOverlaysProps> = ({
  contextMenu, reactionMenu, contextMenuRef, reactionMenuRef, messageInputRef, messages,
  token, chatId, userId, isClosing, wsRef, setContextMenu, setReactionMenu,
  setEditingMessage, setMessageInput, setReplyTo, setModal, closeMenus, onForward,
  onDeleteForMe, isSearchOpen, setIsSearchOpen, getMessageTime, jumpToSearchResult,
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
        wsRef={wsRef}
        isClosing={isClosing}
        onClose={closeMenus}
        reactionMenu={reactionMenu}
        setReactionMenu={setReactionMenu}
        messageInputRef={messageInputRef}
        onForward={onForward}
        onDeleteForMe={onDeleteForMe}
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
      />
    )}
    <MessageSearchDialog
      open={isSearchOpen}
      onOpenChange={setIsSearchOpen}
      messages={messages}
      getMessageTime={getMessageTime}
      onJumpToMessage={jumpToSearchResult}
    />
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
