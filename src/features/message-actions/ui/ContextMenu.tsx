import type { EntityId } from '@/shared/api/entityId';
import React, { forwardRef, useEffect } from 'react';
import { Message, ContextMenuState, ModalState } from '@/entities/message';
import { useDeleteMessageForMeMutation } from '@/entities/message';
import { notifyMessageDeletedLocally } from '@/entities/message';
import ContextMenuComponent from '@/shared/ui/ContextMenuComponent';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  messages: Message[];
  token: string;
  chatId: EntityId;
  userId: EntityId;
  setContextMenu: (value: ContextMenuState | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (value: string) => void;
  setReplyTo: (message: Message | null) => void;
  setModal: (modal: ModalState | null) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  isClosing: boolean;
  onClose: () => void;
  reactionMenu: { message: Message; x: number; y: number; isClosing?: boolean } | null;
  setReactionMenu: (value: { message: Message; x: number; y: number; isClosing?: boolean } | null) => void;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
  canDeleteMessage?: (message: Message) => boolean;
  onForward?: (message: Message) => void;
  onSelect?: (message: Message) => void;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({
    contextMenu,
    messages,
    chatId,
    setContextMenu,
    setEditingMessage,
    setMessageInput,
    setReplyTo,
    setModal,
    wsRef,
    isClosing,
    onClose,
    reactionMenu,
    setReactionMenu,
    messageInputRef,
    canDeleteMessage,
    onForward,
    onSelect,
  }, ref) => {
    const { translations } = useLanguage();
    const [deleteMessageForMe] = useDeleteMessageForMeMutation();
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !event.composedPath().includes(ref.current)) {
          setContextMenu({ ...contextMenu, isClosing: true });
          setTimeout(() => onClose(), 200);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [ref, contextMenu, setContextMenu, onClose]);

    // Close ContextMenu if ReactionMenu is closed
    useEffect(() => {
      if (!reactionMenu) {
        setContextMenu({ ...contextMenu, isClosing: true });
        setTimeout(() => onClose(), 200);
      }
    }, [reactionMenu, contextMenu, setContextMenu, onClose]);

    const copyToClipboard = async (text: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.select();
          const result = document.execCommand('copy');
          document.body.removeChild(textarea);
          return result;
        }
      } catch (err) {
        console.error('Failed to copy:', err);
        return false;
      }
    };

    const message = messages.find((m) => m.id === contextMenu.messageId);
    const isFile = message?.type === 'file';
    const fileContent = message && typeof message.content !== 'string' ? message.content : null;
    const canEdit = !!message && !message.forwarded_from && (message.type === 'message' || (isFile && fileContent?.file_type !== 'voice'));
    const canDelete = message ? (canDeleteMessage ? canDeleteMessage(message) : contextMenu.isMine) : contextMenu.isMine;

    const handleEdit = () => {
      if (message && canEdit) {
        setEditingMessage(message);
        setMessageInput(typeof message.content === 'string' ? message.content : fileContent?.caption || '');
        setReplyTo(null);
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const closeMenu = () => {
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };
    const showDeleteError = () => setModal({ type: 'error', message: translations.webSocketError });

    const handleDeleteForMe = async () => {
      const messageId = contextMenu.messageId;
      closeMenu();
      try {
        await deleteMessageForMe(messageId).unwrap();
        notifyMessageDeletedLocally(chatId, messageId);
      } catch (error) {
        console.error('Failed to delete message for me:', error);
        showDeleteError();
      }
    };

    const handleDeleteForEveryone = () => {
      const socket = wsRef.current;
      closeMenu();
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        showDeleteError();
        return;
      }
      try {
        socket.send(JSON.stringify({ type: 'delete', message_id: contextMenu.messageId }));
      } catch (error) {
        console.error('Failed to delete message for everyone:', error);
        showDeleteError();
      }
    };
    const handleCopy = async () => {
      if (message) {
        const text = message.type === 'file' && typeof message.content !== 'string' ? message.content.file_url : String(message.content);
        await copyToClipboard(text);
      }
      closeMenu();
    };

    const handleReply = () => {
      if (message) {
        setReplyTo(message);
        setEditingMessage(null);
        setMessageInput('');
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const handleForward = () => {
      if (message && onForward) {
        onForward(message);
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    return (
      <ContextMenuComponent
        ref={ref}
        x={contextMenu.x}
        y={contextMenu.y}
        isMine={contextMenu.isMine}
        openLeft={contextMenu.openLeft}
        {...(canEdit && { onEdit: handleEdit })}
        onDeleteForMe={() => void handleDeleteForMe()}
        onDeleteForEveryone={canDelete ? handleDeleteForEveryone : undefined}
        {...(!isFile && { onCopy: handleCopy })}
        onReply={handleReply}
        onForward={onForward && message ? handleForward : undefined}
        onSelect={onSelect && message ? () => { onSelect(message); closeMenu(); } : undefined}
        isClosing={isClosing || !!contextMenu.isClosing}
        onClose={onClose}
      />
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
