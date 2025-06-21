import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/types';
import { useChat } from './useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Modal from './Modal';
import ContextMenu from './ContextMenu';
import ReactionMenu from './ReactionMenu';
import UserProfileComponent from '@/profiles/UserProfileComponent';
import { DELETED_AVATAR, DEFAULT_AVATAR } from '@/base/ui';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface ChatProps {
  chatId: number;
  chatName: string;
  username: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
}

const Chat: React.FC<ChatProps> = ({ chatId, chatName, username, interlocutorDeleted, onBack, setIsUserProfileOpen }) => {
  const token = localStorage.getItem('access_token') || '';
  const [userId, setUserId] = useState<number | null>(null);
  // NEW: Add state for temporary highlight
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<number | null>(null);

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
    wsRef,
  } = useChat(chatId, username, token, onBack);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [isClosing, setIsClosing] = useState(false);

  const [reactionMenu, setReactionMenu] = useState<{ message: Message; x: number; y: number; isClosing?: boolean } | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data.id);
        } else {
          console.error('Failed to fetch user ID');
        }
      } catch (err) {
        console.error('Error fetching user ID:', err);
      }
    };

    if (token) {
      fetchUserId();
    }
  }, [token]);

  const closeMenus = () => {
    setContextMenu(null);
    setReactionMenu(null);
    setIsClosing(false);
  };

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    if (window.innerWidth < 768 || e.type === 'contextmenu') {
      e.preventDefault();
      if (!interlocutorDeleted) {
        if (contextMenu && contextMenu.messageId === message.id && reactionMenu && reactionMenu.message.id === message.id) {
          setIsClosing(true);
          setTimeout(() => {
            closeMenus();
            setIsClosing(false);
          }, 200);
        } else {
          if (contextMenu || reactionMenu) {
            setIsClosing(true);
            setTimeout(() => {
              closeMenus();
              setIsClosing(false);
              const msgElement = messageRefs.current[message.id];
              if (msgElement) {
                const rect = msgElement.getBoundingClientRect();
                const reactionY = e.clientY - 45;
                setReactionMenu({ message, x: e.clientX, y: reactionY });
                setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: message.sender === username });
              }
            }, 200);
          } else {
            const msgElement = messageRefs.current[message.id];
            if (msgElement) {
              const rect = msgElement.getBoundingClientRect();
              const reactionY = e.clientY - 45;
              setReactionMenu({ message, x: e.clientX, y: reactionY });
              setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: message.sender === username });
            }
          }
        }
        e.stopPropagation();
      }
    }
  };

  const onOpenProfile = () => setIsUserProfileOpen(true);
  const interlocutorAvatar = interlocutorDeleted 
    ? DELETED_AVATAR 
    : (messages.find(msg => msg.sender !== username)?.avatar_url || DEFAULT_AVATAR);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        chatName={chatName}
        interlocutorDeleted={interlocutorDeleted}
        onBack={onBack}
        onDeleteChat={handleDeleteChat}
        onOpenProfile={onOpenProfile}
        interlocutorAvatar={interlocutorAvatar}
      />
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
        userId={userId}
        wsRef={wsRef}
        onOpenReactionMenu={(message, e) => {
          if (reactionMenu && reactionMenu.message.id === message.id && contextMenu && contextMenu.messageId === message.id) {
            setIsClosing(true);
            setTimeout(() => closeMenus(), 200);
          } else {
            if (contextMenu || reactionMenu) {
              setIsClosing(true);
              setTimeout(() => {
                closeMenus();
                const msgElement = messageRefs.current[message.id];
                if (msgElement) {
                  const rect = msgElement.getBoundingClientRect();
                  const reactionY = e.clientY - 35;
                  setReactionMenu({ message, x: e.clientX, y: reactionY });
                  setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: message.sender === username });
                }
              }, 200);
            } else {
              const msgElement = messageRefs.current[message.id];
              if (msgElement) {
                const rect = msgElement.getBoundingClientRect();
                const reactionY = e.clientY - 35;
                setReactionMenu({ message, x: e.clientX, y: reactionY });
                setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id, isMine: message.sender === username });
              }
            }
          }
        }}
        // NEW: Pass temp highlight props
        tempHighlightedMessageId={tempHighlightedMessageId}
        setTempHighlightedMessageId={setTempHighlightedMessageId}
      />
      {!interlocutorDeleted ? (
        <MessageInput
          ref={messageInputRef}
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
      {selectedUser && <UserProfileComponent username={selectedUser} onClose={() => setSelectedUser(null)} />}
      <Modal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
};

export default Chat;
