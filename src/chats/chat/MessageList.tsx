import React, { forwardRef } from 'react';
import { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  username: string;
  interlocutorDeleted: boolean;
  onMessageClick: (e: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  highlightedMessageId: number | null;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  renderMessageContent: (message: Message) => JSX.Element;
  messageRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onReplyClick: (messageId: number) => void;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  const {
    messages,
    username,
    interlocutorDeleted,
    onMessageClick,
    onAvatarClick,
    highlightedMessageId,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    messageRefs,
    onReplyClick,
  } = props;

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message, index) => {
        const isMine = message.sender === username;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator =
          !prevMessage || getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp);

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && (
              <div className="flex justify-center">
                <div className="px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground">
                  {getFormattedDateLabel(message.timestamp)}
                </div>
              </div>
            )}
            <div
              ref={(el) => (messageRefs.current[message.id] = el)}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
                highlightedMessageId === message.id ? 'highlighted-message' : ''
              }`}
              onClick={(e) => onMessageClick(e, message)}
              onContextMenu={(e) => onMessageClick(e, message)}
            >
              <div className={`flex items-end space-x-2 max-w-[70%] ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <img
                  src={message.avatar_url}
                  alt={message.sender}
                  className="w-8 h-8 rounded-full cursor-pointer"
                  onClick={() => !interlocutorDeleted && onAvatarClick(message.sender)}
                />
                <div className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="text-sm text-muted-foreground mb-1">
                      {interlocutorDeleted ? 'Deleted User' : message.sender}
                    </span>
                  )}
                  <div
                    className={`relative px-4 py-2 rounded-2xl ${
                      isMine
                        ? 'bg-primary text-primary-foreground message-tail-right'
                        : 'bg-accent text-accent-foreground message-tail-left'
                    } ${message.type === 'file' ? 'max-w-[250px]' : ''}`}
                  >
                    {message.reply_to && (
                      <div
                        className={`mb-2 p-2 rounded text-sm ${
                          isMine ? 'bg-primary-darker' : 'bg-accent-darker'
                        } cursor-pointer hover:bg-opacity-70 transition-all`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplyClick(message.reply_to);
                        }}
                      >
                        {(() => {
                          const replyMessage = messages.find((m) => m.id === message.reply_to);
                          if (!replyMessage) return 'Message deleted';
                          return typeof replyMessage.content === 'string'
                            ? replyMessage.content
                            : replyMessage.content.file_name;
                        })()}
                      </div>
                    )}
                    {renderMessageContent(message)}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{getMessageTime(message.timestamp)}</span>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
});

export default MessageList;