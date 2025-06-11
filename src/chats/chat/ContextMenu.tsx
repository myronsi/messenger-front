import React, { forwardRef, useEffect } from 'react';
import { Message, ContextMenuState, ModalState } from '@/types';
import ContextMenuComponent from '@/components/ContextMenuComponent';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  messages: Message[];
  token: string;
  chatId: number;
  setContextMenu: (value: ContextMenuState | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setMessageInput: (value: string) => void;
  setReplyTo: (message: Message | null) => void;
  setModal: (modal: ModalState | null) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ contextMenu, messages, token, chatId, setContextMenu, setEditingMessage, setMessageInput, setReplyTo, setModal, wsRef }, ref) => {
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !ref.current.contains(event.target as Node)) {
          setContextMenu(null);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [setContextMenu, ref]);

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

    return (
      <ContextMenuComponent
        ref={ref}
        x={contextMenu.x}
        y={contextMenu.y}
        isMine={contextMenu.isMine}
        onEdit={() => {
          const msg = messages.find(m => m.id === contextMenu.messageId);
          if (msg && msg.type === 'message') {
            setEditingMessage(msg);
            setMessageInput(typeof msg.content === 'string' ? msg.content : '');
            setReplyTo(null);
          }
          setContextMenu(null);
        }}
        onDelete={() => {
          setModal({
            type: 'deleteMessage',
            message: 'Confirm delete?',
            onConfirm: () => {
              if (contextMenu && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'delete', message_id: contextMenu.messageId }));
              }
              setContextMenu(null);
              setModal(null);
            },
          });
        }}
        onCopy={async () => {
          const msg = messages.find(m => m.id === contextMenu.messageId);
          if (msg) {
            const text = msg.type === 'file' && typeof msg.content !== 'string' ? msg.content.file_url : String(msg.content);
            const success = await copyToClipboard(text);
            setModal({ 
              type: 'copy', 
              message: success ? 'Message copied' : 'Failed to copy message' 
            });
            setTimeout(() => setModal(null), 1500);
          }
          setContextMenu(null);
        }}
        onReply={() => {
          const msg = messages.find(m => m.id === contextMenu.messageId);
          if (msg) {
            setReplyTo(msg);
            setEditingMessage(null);
            setMessageInput('');
          }
          setContextMenu(null);
        }}
      />
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
