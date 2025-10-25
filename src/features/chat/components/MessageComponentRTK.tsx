import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useLanguage } from '@/shared/contexts/LanguageContext';
const BASE_URL = import.meta.env.VITE_BASE_URL;
import {
  useGetMessageHistoryQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
} from '@/app/api/messengerApi';
import { Message } from '@/entities/message';

interface MessageComponentRTKProps {
  chatId: number;
  currentUsername: string;
}

const MessageComponentRTK: React.FC<MessageComponentRTKProps> = ({ chatId, currentUsername }) => {
  const { translations } = useLanguage();
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RTK Query hooks
  const {
    data: messagesData,
    error, 
    isLoading,
    refetch 
  } = useGetMessageHistoryQuery(chatId);

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [updateMessage, { isLoading: isUpdating }] = useUpdateMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [addReaction] = useAddReactionMutation();
  const [removeReaction] = useRemoveReactionMutation();

  // Transform API messages (server returns { history: [...] }) to local format
  const messages: Message[] = React.useMemo(() => {
    if (!messagesData || !(messagesData as any).history) return [];
    try {
      return (messagesData as any).history.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender || '',
        content: msg.type === 'file' ? (typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content) : msg.content || '',
        timestamp: msg.timestamp,
        avatar_url: msg.avatar_url ? `${BASE_URL}${msg.avatar_url}` : '',
        reply_to: msg.reply_to || null,
        is_deleted: !!msg.is_deleted,
        type: msg.type === 'file' ? 'file' : 'message',
        reactions: msg.reactions ? JSON.parse(msg.reactions) : [],
        read_by: msg.read_by ? JSON.parse(msg.read_by) : [],
      } as Message));
    } catch (e) {
      console.error('Failed to transform messagesData:', e, messagesData);
      return [];
    }
  }, [messagesData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage({
        chatId,
        content: newMessage,
        type: 'text',
      }).unwrap();
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle editing message
  const handleEditMessage = async (messageId: number) => {
    if (!editingContent.trim()) return;

    try {
      await updateMessage({
        id: messageId,
        content: editingContent,
      }).unwrap();
      
      setEditingMessageId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle deleting message
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId).unwrap();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Handle reaction
  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      const existingReaction = messages
        .find(m => m.id === messageId)
        ?.reactions?.find(r => r.reaction === emoji);

      if (existingReaction) {
        await removeReaction({ messageId, emoji }).unwrap();
      } else {
        await addReaction({ messageId, emoji }).unwrap();
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      await sendMessage({
        chatId,
        type: 'file',
        file,
      }).unwrap();
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{translations.loading}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">{translations.errorLoading}</p>
          <Button onClick={refetch} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group">
              {editingMessageId === message.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleEditMessage(message.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className={`flex ${message.sender === currentUsername ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === currentUsername
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    <div className="text-sm mb-1">
                      {message.sender !== currentUsername && (
                        <span className="font-medium">{message.sender}</span>
                      )}
                    </div>
                    <div>
                      {typeof message.content === 'string' ? message.content : message.content.file_name}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction, index) => (
                          <button
                            key={index}
                            onClick={() => handleReaction(message.id, reaction.reaction)}
                            className="text-xs bg-white bg-opacity-20 rounded px-1 py-0.5"
                          >
                            {reaction.reaction}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Message actions (only show on hover for own messages) */}
                    {message.sender === currentUsername && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingContent(message.content.toString());
                            }}
                            className="text-xs underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-xs underline text-red-400"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleReaction(message.id, '👍')}
                            className="text-xs"
                          >
                            👍
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageComponentRTK;