import React, { forwardRef, useEffect } from 'react';
import { Message, ContextMenuState, ModalState } from '@/entities/message';
import ContextMenuComponent from '@/shared/ui/ContextMenuComponent';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  messages: Message[];
  token: string;
  chatId: number;
  userId: number;
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
  messageInputRef: React.RefObject<HTMLInputElement>;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({
    contextMenu,
    messages,
    token,
    chatId,
    userId,
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
  }, ref) => {
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !ref.current.contains(event.target as Node)) {
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

    const handleEdit = () => {
      if (message && message.type === 'message') {
        setEditingMessage(message);
        setMessageInput(typeof message.content === 'string' ? message.content : '');
        setReplyTo(null);
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const handleDelete = () => {
      setModal({
        type: 'deleteMessage',
        message: 'Confirm delete?',
        onConfirm: () => {
          if (contextMenu && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'delete', message_id: contextMenu.messageId }));
          }
          setContextMenu(null);
          setReactionMenu(null);
          setModal(null);
        },
      });
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 200);
    };

    const handleCopy = async () => {
      if (message) {
        const text = message.type === 'file' && typeof message.content !== 'string' ? message.content.file_url : String(message.content);
        await copyToClipboard(text);
      }
      setContextMenu({ ...contextMenu, isClosing: true });
      setReactionMenu(reactionMenu ? { ...reactionMenu, isClosing: true } : null);
      setTimeout(() => onClose(), 1500);
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

    return (
      <ContextMenuComponent
        ref={ref}
        x={contextMenu.x}
        y={contextMenu.y}
        isMine={contextMenu.isMine}
        {...(!isFile && { onEdit: handleEdit })}
        onDelete={handleDelete}
        {...(!isFile && { onCopy: handleCopy })}
        onReply={handleReply}
        isClosing={isClosing}
        onClose={onClose}
      />
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
