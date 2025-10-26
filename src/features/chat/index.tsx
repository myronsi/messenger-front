import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/entities/message';
import { useChat } from './model/useChat';
import { useCreateChatMutation, useSendMessageMutation, useUploadFileMutation } from '@/app/api/messengerApi';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import Modal from './components/Modal';
import ContextMenu from './components/ContextMenu';
import ReactionMenu from './components/ReactionMenu';
import UserProfileComponent from '@/features/profiles/UserProfileComponent';
import { DELETED_AVATAR, DEFAULT_AVATAR } from '@/shared/base/ui';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface ChatProps {
  chatId: number;
  chatName: string;
  username: string;
  interlocutorDeleted: boolean;
  onBack: () => void;
  setIsUserProfileOpen: (isOpen: boolean) => void;
  // Called when a preview chat is upgraded to a real chat after first message is sent
  onChatCreated?: (newId: number, newName: string) => void;
}

import { Drawer, DrawerContent } from "@/shared/ui/drawer";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const Chat: React.FC<ChatProps> = ({ chatId, chatName, username, interlocutorDeleted, onBack, setIsUserProfileOpen, onChatCreated }) => {
  const token = localStorage.getItem('access_token') || '';
  const [userId, setUserId] = useState<number | null>(null);
  const [tempHighlightedMessageId, setTempHighlightedMessageId] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const isPreview = chatId < 0;

  // Mutations for creating a chat and sending messages (used in preview mode)
  const [createChat] = useCreateChatMutation();
  const [sendMessage] = useSendMessageMutation();
  const [uploadFile] = useUploadFileMutation();

  // When not preview — use the normal hook
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
  } = isPreview ? {
    messages: [] as Message[],
    messageInput: '',
    setMessageInput: (_: string) => {},
    contextMenu: null,
    setContextMenu: (_: any) => {},
    replyTo: null,
    setReplyTo: (_: any) => {},
    editingMessage: null,
    setEditingMessage: (_: any) => {},
    selectedUser: null,
    setSelectedUser: (_: any) => {},
    modal: null,
    setModal: (_: any) => {},
    highlightedMessageId: null,
    scrollToMessage: (_: number) => {},
    handleSendMessage: () => {},
    handleFileUpload: (_: any) => {},
    handleDeleteChat: () => {},
    getFormattedDateLabel: (s: string) => formatDateLabel(new Date(s), 'en', new Date(), new Date()),
    getMessageTime: (s: string) => formatTime(s, 'en'),
    renderMessageContent: (m: Message) => null,
    wsRef: { current: null } as any,
  } : useChat(chatId, username, token, onBack);

  // Local state & handlers for preview mode
  const [previewMessageInput, setPreviewMessageInput] = useState('');
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);

  const handleSendMessagePreview = async () => {
    const content = previewMessageInput.trim();
    if (!content) return;
    try {
      // create the chat on the server
      const res = await createChat({ user1: username, user2: chatName }).unwrap();
      const newChatId = res.chat_id;
      // store the pending message so Chat's WebSocket can send it once connected
      try {
        sessionStorage.setItem(`pendingMsg:${newChatId}`, content);
      } catch (e) {
        console.warn('Could not store pending message in sessionStorage', e);
      }
      setPreviewMessageInput('');
      // notify parent to switch to the real chat id (will remount Chat and send pending message)
      if (onChatCreated) onChatCreated(newChatId, chatName);
    } catch (err) {
      console.error('Failed to create chat/send message:', err);
      setModal({ type: 'error', message: 'Failed to send message. Please try again.' });
    }
  };

  const handleFileUploadPreview = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const res = await createChat({ user1: username, user2: chatName }).unwrap();
      const newChatId = res.chat_id;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chat_id', newChatId.toString());
      await uploadFile(formData).unwrap();
      if (onChatCreated) onChatCreated(newChatId, chatName);
    } catch (err) {
      console.error('Failed to create chat/upload file:', err);
      setModal({ type: 'error', message: 'Failed to upload file. Please try again.' });
    }
  };

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

  const content = (
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
        userId={userId || 0}
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
        tempHighlightedMessageId={tempHighlightedMessageId}
        setTempHighlightedMessageId={setTempHighlightedMessageId}
      />
      {!interlocutorDeleted ? (
        <MessageInput
          ref={messageInputRef}
          messageInput={isPreview ? previewMessageInput : messageInput}
          setMessageInput={isPreview ? setPreviewMessageInput : setMessageInput}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onSendMessage={isPreview ? handleSendMessagePreview : handleSendMessage}
          onFileUpload={isPreview ? handleFileUploadPreview : handleFileUpload}
          onCancelReplyOrEdit={() => {
            if (isPreview) {
              setPreviewMessageInput('');
            } else {
              setReplyTo(null);
              setEditingMessage(null);
              setMessageInput('');
            }
          }}
          chatId={chatId}
          token={token}
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

  return isMobile ? (
    <Drawer open={true} onClose={onBack} direction="right">
      <DrawerContent className="h-[100dvh] p-0">{content}</DrawerContent>
    </Drawer>
  ) : (
    content
  );
};

export default Chat;
