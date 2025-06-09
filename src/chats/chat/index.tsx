import React, { useRef } from 'react';
import { Message } from '@/types';
import { useChat } from './useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Modal from './Modal';
import ContextMenuComponent from '@/components/ContextMenuComponent';
import UserProfileComponent from '@/profiles/UserProfileComponent';

interface ChatProps {
  chatId: number;
  chatName: string;
  username: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
}

const Chat: React.FC<ChatProps> = ({ chatId, chatName, username, interlocutorDeleted, onBack }) => {
  const token = localStorage.getItem('access_token') || '';
  const {
    messages,
    messageInput,
    setMessageInput,
    contextMenu,
    setContextMenu,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    selectedUser,
    setSelectedUser,
    modal,
    setModal,
    highlightedMessageId,
    scrollToMessage,
    handleSendMessage,
    handleFileUpload,
    handleDeleteChat,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
  } = useChat(chatId, username, token, onBack);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || e.type === 'contextmenu') {
      e.preventDefault();
      if (!interlocutorDeleted) {
        setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: message.sender === username });
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ChatHeader chatName={chatName} interlocutorDeleted={interlocutorDeleted} onBack={onBack} onDeleteChat={handleDeleteChat} />
      <MessageList
        ref={chatWindowRef}
        messages={messages}
        username={username}
        interlocutorDeleted={interlocutorDeleted}
        onMessageClick={handleMessageClick}
        onAvatarClick={setSelectedUser}
        highlightedMessageId={highlightedMessageId}
        getFormattedDateLabel={getFormattedDateLabel}
        getMessageTime={getMessageTime}
        renderMessageContent={renderMessageContent}
        messageRefs={messageRefs}
        onReplyClick={scrollToMessage}
      />
      {!interlocutorDeleted ? (
        <MessageInput
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onCancelReplyOrEdit={() => { setReplyTo(null); setEditingMessage(null); setMessageInput(''); }}
        />
      ) : (
        <div className="p-4 border-t border-border">
          <button onClick={handleDeleteChat} className="w-full p-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
            Delete Chat
          </button>
        </div>
      )}
      {contextMenu && (
        <ContextMenuComponent
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          isMine={contextMenu.isMine}
          onEdit={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg && msg.type === 'message') { setEditingMessage(msg); setMessageInput(typeof msg.content === 'string' ? msg.content : ''); setReplyTo(null); }
            setContextMenu(null);
          }}
          onDelete={() => {
            setModal({
              type: 'deleteMessage',
              message: 'Confirm delete?',
              onConfirm: () => {
                if (contextMenu) {
                  const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/chat/${chatId}?token=${token}`);
                  ws.onopen = () => {
                    ws.send(JSON.stringify({ type: 'delete', message_id: contextMenu.messageId }));
                    ws.close();
                  };
                }
                setContextMenu(null);
                setModal(null);
              },
            });
          }}
          onCopy={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) {
              const text = msg.type === 'file' && typeof msg.content !== 'string' ? msg.content.file_url : String(msg.content);
              navigator.clipboard.writeText(text);
              setModal({ type: 'copy', message: 'Message copied' });
              setTimeout(() => setModal(null), 1500);
            }
            setContextMenu(null);
          }}
          onReply={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) { setReplyTo(msg); setEditingMessage(null); setMessageInput(''); }
            setContextMenu(null);
          }}
        />
      )}
      {selectedUser && <UserProfileComponent username={selectedUser} onClose={() => setSelectedUser(null)} />}
      <Modal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
};

export default Chat;
