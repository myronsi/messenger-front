
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, X } from 'lucide-react';
import { Message } from '../types';
import ContextMenuComponent from './ContextMenuComponent';
import UserProfileComponent from './UserProfileComponent';
import ConfirmModal from './ConfirmModal';

interface GroupComponentProps {
  chatId: number;
  groupName: string;
  username: string;
  onBack: () => void;
}

const BASE_URL = "http://192.168.178.29:8000";
const WS_URL = "ws://192.168.178.29:8000";
const DEFAULT_AVATAR = "/static/avatars/default.jpg";

const GroupComponent: React.FC<GroupComponentProps> = ({ chatId, groupName, username, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMine: boolean } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: 'deleteMessage' | 'deleteGroup' | 'error' | 'copy';
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [isChatValid, setIsChatValid] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const token = localStorage.getItem('access_token');
  const hasFetchedMessages = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (hasFetchedMessages.current) return;
      hasFetchedMessages.current = true;
      try {
        const response = await fetch(`${BASE_URL}/messages/history/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.history.map((msg: Message) => ({
            ...msg,
            avatar_url: msg.avatar_url || DEFAULT_AVATAR,
            reply_to: msg.reply_to || null,
          })));
        } else if (response.status === 401) {
          setModal({ type: 'error', message: 'Сессия истекла. Войдите снова.' });
          setTimeout(() => {
            localStorage.removeItem('access_token');
            window.location.href = '/';
          }, 2000);
        } else {
          throw new Error('Ошибка загрузки сообщений');
        }
      } catch (err) {
        setModal({ type: 'error', message: 'Ошибка при загрузке сообщений.' });
        setIsChatValid(false);
      }
    };

    const connectWebSocket = () => {
      if (!token || !isChatValid || (wsRef.current?.readyState === WebSocket.OPEN)) return;

      console.log(`Connecting WebSocket for group ${chatId}`);
      wsRef.current = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${token}`);

      wsRef.current.onopen = () => console.log(`WebSocket connected for group ${chatId}`);

      wsRef.current.onmessage = (event) => {
        let parsedData;
        try {
          parsedData = JSON.parse(event.data);
        } catch (error) {
          console.error('Received non-JSON message:', event.data);
          return;
        }

        const { type } = parsedData;

        if (type === "message") {
          const { username: sender, data, timestamp, avatar_url } = parsedData;
          if (data.chat_id !== chatId) return;
          const newMessage = {
            id: data.message_id,
            sender,
            content: data.content,
            timestamp,
            avatar_url: avatar_url || DEFAULT_AVATAR,
            reply_to: data.reply_to || null,
            is_deleted: false,
          };
          setMessages((prev) => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        } else if (type === "edit") {
          const { message_id, new_content } = parsedData;
          setMessages((prev) => prev.map(m => m.id === message_id ? { ...m, content: new_content } : m));
          setEditingMessage(null);
          setMessageInput('');
        } else if (type === "delete") {
          const { message_id } = parsedData;
          setMessages((prev) => prev.filter(m => m.id !== message_id));
        } else if (type === "chat_deleted" && parsedData.chat_id === chatId) {
          console.log(`Chat ${chatId} deleted, closing WebSocket`);
          setIsChatValid(false);
          setModal({ type: 'error', message: 'Группа была удалена.' });
          if (wsRef.current) wsRef.current.close(1000);
          setTimeout(onBack, 1000);
        } else if (type === "error") {
          if (parsedData.message === "Chat does not exist" || parsedData.message === "You are not a member of this chat") {
            console.log(`WebSocket error: ${parsedData.message}, closing WebSocket`);
            setIsChatValid(false);
            setModal({ type: 'error', message: 'Группа была удалена или недоступна.' });
            if (wsRef.current) wsRef.current.close(1000);
            setTimeout(onBack, 1000);
          } else {
            setModal({ type: 'error', message: parsedData.message });
          }
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket closed for group ${chatId}. Code: ${event.code}, Reason: ${event.reason}`);
        if (isChatValid && event.code !== 1000 && event.code !== 1008) {
          console.log(`Reconnecting WebSocket for group ${chatId} in 1 second...`);
          setTimeout(connectWebSocket, 1000);
        }
      };

      wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
    };

    if (token) {
      loadMessages();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log(`Closing WebSocket for group ${chatId} on unmount`);
        wsRef.current.close(1000);
      }
      hasFetchedMessages.current = false;
    };
  }, [chatId, token, onBack, isChatValid]);

  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToMessage = (messageId: number) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  useEffect(() => scrollToBottom(), [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (editingMessage) {
      wsRef.current.send(JSON.stringify({
        type: "edit",
        message_id: editingMessage.id,
        content: messageInput,
      }));
    } else {
      wsRef.current.send(JSON.stringify({
        type: "message",
        content: messageInput,
        reply_to: replyTo?.id || null,
      }));
    }

    setMessageInput('');
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleDeleteGroup = () => {
    setModal({
      type: 'deleteGroup',
      message: 'Вы уверены, что хотите удалить эту группу?',
      onConfirm: async () => {
        try {
          const response = await fetch(`${BASE_URL}/groups/delete/${chatId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            setIsChatValid(false);
            onBack();
          } else {
            throw new Error('Не удалось удалить группу');
          }
        } catch (err) {
          setModal({ type: 'error', message: 'Ошибка при удалении группы.' });
        }
      },
    });
  };

  const formatDateLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today.setDate(today.getDate() - 1));
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">{groupName}</h2>
        </div>
        <button onClick={handleDeleteGroup} className="text-destructive hover:text-destructive/90 transition-colors">
          Удалить группу
        </button>
      </div>

      <div ref={chatWindowRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => {
          const isMine = message.sender === username;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDate = !prevMessage || formatDateLabel(message.timestamp) !== formatDateLabel(prevMessage.timestamp);

          return (
            <React.Fragment key={message.id}>
              {showDate && (
                <div className="flex justify-center">
                  <div className="px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground">
                    {formatDateLabel(message.timestamp)}
                  </div>
                </div>
              )}
              <div
                ref={(el) => (messageRefs.current[message.id] = el)}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${highlightedMessageId === message.id ? 'bg-yellow-100/10 rounded-xl p-2 transition-colors duration-300' : ''}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  setContextMenu({ x, y, messageId: message.id, isMine });
                }}
              >
                <div className={`flex items-end space-x-2 max-w-[70%] ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <img
                    src={`${BASE_URL}${message.avatar_url}`}
                    alt={message.sender}
                    className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedUser(message.sender)}
                  />
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && <span className="text-sm text-muted-foreground mb-1">{message.sender}</span>}
                    <div className={`relative px-4 py-2 rounded-2xl ${isMine ? 'bg-primary text-primary-foreground message-tail-right' : 'bg-accent text-accent-foreground message-tail-left'}`}>
                      {message.reply_to && (
                        <div
                          onClick={() => scrollToMessage(message.reply_to!)}
                          className={`mb-2 p-2 rounded text-sm cursor-pointer ${
                            isMine 
                              ? 'bg-primary-darker/50 hover:bg-primary-darker/70'
                              : 'bg-accent-darker/50 hover:bg-accent-darker/70'
                          } transition-colors`}
                        >
                          {messages.find(m => m.id === message.reply_to)?.content || '[Сообщение удалено]'}
                        </div>
                      )}
                      <div>{message.content}</div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{getMessageTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        {(replyTo || editingMessage) && (
          <div className="flex items-center mb-2 p-2 bg-accent rounded-lg">
            <span className="flex-1 text-sm text-muted-foreground">
              {replyTo ? `Ответ на: ${replyTo.content}` : `Редактирование: ${editingMessage!.content}`}
            </span>
            <button 
              onClick={() => { setReplyTo(null); setEditingMessage(null); setMessageInput(''); }} 
              className="p-1 hover:bg-accent rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={editingMessage ? "Редактировать сообщение..." : "Написать сообщение..."}
            className="flex-1 px-4 py-2 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {contextMenu && (
        <ContextMenuComponent
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          isMine={contextMenu.isMine}
          onEdit={() => {
            const message = messages.find(m => m.id === contextMenu.messageId);
            if (message) {
              setEditingMessage(message);
              setMessageInput(message.content);
              setReplyTo(null);
            }
            setContextMenu(null);
          }}
          onDelete={() => {
            setModal({
              type: 'deleteMessage',
              message: 'Удалить сообщение?',
              onConfirm: () => {
                if (wsRef.current) {
                  wsRef.current.send(JSON.stringify({ type: "delete", message_id: contextMenu.messageId }));
                }
                setContextMenu(null);
                setModal(null);
              },
            });
          }}
          onCopy={() => {
            const message = messages.find(m => m.id === contextMenu.messageId);
            if (message) {
              navigator.clipboard.writeText(message.content);
              setModal({ type: 'copy', message: 'Сообщение скопировано!' });
              setTimeout(() => setModal(null), 1500);
            }
            setContextMenu(null);
          }}
          onReply={() => {
            const message = messages.find(m => m.id === contextMenu.messageId);
            if (message) {
              setReplyTo(message);
              setEditingMessage(null);
              setMessageInput('');
            }
            setContextMenu(null);
          }}
        />
      )}

      {selectedUser && (
        <UserProfileComponent username={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {modal && (
        <ConfirmModal
          title={
            modal.type === 'deleteMessage' ? 'Удаление сообщения' :
            modal.type === 'deleteGroup' ? 'Удаление группы' :
            modal.type === 'copy' ? 'Успех' : 'Ошибка'
          }
          message={modal.message}
          onConfirm={modal.onConfirm || (() => setModal(null))}
          onCancel={() => setModal(null)}
          confirmText={modal.type === 'copy' || modal.type === 'error' ? 'OK' : 'Подтвердить'}
          isError={modal.type === 'error'}
        />
      )}
    </div>
  );
};

export default GroupComponent;
