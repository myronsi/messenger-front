import React, { useRef } from 'react';
import { Message } from '@/types';
import { useChat } from './useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Modal from './Modal';
import ContextMenu from './ContextMenu';
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
    wsRef, // Destructure wsRef
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
        contextMenuMessageId={contextMenu?.messageId}
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
        <ContextMenu
          ref={contextMenuRef}
          contextMenu={contextMenu}
          messages={messages}
          token={token}
          chatId={chatId}
          setContextMenu={setContextMenu}
          setEditingMessage={setEditingMessage}
          setMessageInput={setMessageInput}
          setReplyTo={setReplyTo}
          setModal={setModal}
          wsRef={wsRef} // Pass wsRef
        />
      )}
      {selectedUser && <UserProfileComponent username={selectedUser} onClose={() => setSelectedUser(null)} />}
      <Modal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
};

export default Chat;
