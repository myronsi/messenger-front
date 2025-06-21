import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Message } from '@/types';
const BASE_URL = import.meta.env.VITE_BASE_URL;

interface MessageListProps {
  messages: Message[];
  username: string;
  userId: number;
  interlocutorDeleted: boolean;
  onMessageClick: (e: React.MouseEvent, message: Message) => void;
  onAvatarClick: (username: string) => void;
  highlightedMessageId: number | null;
  contextMenuMessageId?: number;
  getFormattedDateLabel: (timestamp: string) => string;
  getMessageTime: (timestamp: string) => string;
  renderMessageContent: (message: Message) => JSX.Element;
  messageRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onReplyClick: (messageId: number) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onOpenReactionMenu: (message: Message, e: React.MouseEvent) => void;
  // NEW: Add props for temporary highlight
  tempHighlightedMessageId: number | null;
  setTempHighlightedMessageId: (id: number | null) => void;
}

const groupReactions = (reactions: { user_id: number; reaction: string }[]) => {
  const reactionMap: { [key: string]: { count: number; users: number[] } } = {};
  reactions.forEach((r) => {
    if (!reactionMap[r.reaction]) {
      reactionMap[r.reaction] = { count: 0, users: [] };
    }
    reactionMap[r.reaction].count += 1;
    reactionMap[r.reaction].users.push(r.user_id);
  });
  return Object.entries(reactionMap).map(([reaction, data]) => ({
    reaction,
    count: data.count,
    users: data.users,
  }));
};

// Helper function to validate timestamp
const isValidTimestamp = (timestamp: string | undefined | null): boolean => {
  if (!timestamp) return false;
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  const {
    messages,
    username,
    userId,
    interlocutorDeleted,
    onMessageClick,
    onAvatarClick,
    highlightedMessageId,
    contextMenuMessageId,
    getFormattedDateLabel,
    getMessageTime,
    renderMessageContent,
    messageRefs,
    onReplyClick,
    wsRef,
    // NEW: Destructure new props
    tempHighlightedMessageId,
    setTempHighlightedMessageId,
  } = props;

  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const updateCurrentDate = () => {
    if (!chatContainerRef.current || messages.length === 0) {
      setCurrentDate(null);
      return;
    }

    const scrollPosition = chatContainerRef.current.scrollTop;
    let lastSeparatorDate: string | null = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageEl = messageRefs.current[message.id];
      if (messageEl && isValidTimestamp(message.timestamp)) {
        const messageTop = messageEl.offsetTop;
        const isSeparator = i === 0 || 
          getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(messages[i - 1].timestamp);

        if (isSeparator && messageTop <= scrollPosition) {
          lastSeparatorDate = getFormattedDateLabel(message.timestamp);
        } else if (messageTop > scrollPosition) {
          break;
        }
      }
    }

    const firstValidMessage = messages.find((msg) => isValidTimestamp(msg.timestamp));
    setCurrentDate(lastSeparatorDate || (firstValidMessage ? getFormattedDateLabel(firstValidMessage.timestamp) : null));
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500);

      updateCurrentDate();
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      updateCurrentDate();
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, getFormattedDateLabel]);

  const handleReactionClick = (messageId: number, reaction: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = messages.find((m) => m.id === messageId);
      const hasReaction = message?.reactions?.some((r) => r.user_id === userId && r.reaction === reaction);

      wsRef.current.send(
        JSON.stringify({
          type: hasReaction ? 'reaction_remove' : 'reaction_add',
          message_id: messageId,
          reaction,
        })
      );
    }
  };

  const getReactionBackground = (
    isMine: boolean,
    reactionUsers: number[],
    reaction: string
  ) => {
    const myReaction = reactionUsers.includes(userId);
    const othersReaction = reactionUsers.some((id) => id !== userId);

    if (isMine) {
      if (myReaction) {
        return 'bg-white text-black';
      }
      if (othersReaction) {
        return 'bg-[hsl(221.2,83.2%,43.3%)] text-white';
      }
    } else {
      if (myReaction) {
        return 'bg-primary text-primary-foreground';
      }
      if (othersReaction) {
        return 'bg-[hsl(0,0%,90%)] text-black';
      }
    }
    return 'bg-secondary text-secondary-foreground';
  };

  const renderContent = (message: Message) => {
    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const fileUrl = message.content.file_url || '';
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension && ['png', 'jpg', 'jpeg'].includes(extension)) {
        return (
          <img
            src={`${BASE_URL}${fileUrl}`}
            alt={fileName}
            className="max-w-full h-auto rounded-lg select-none"
            style={{ maxHeight: '300px' }}
          />
        );
      }
    }
    return renderMessageContent(message);
  };

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    if (message.reply_to && e.type === 'click' && !interlocutorDeleted) {
      // MODIFIED: Use state for highlighting instead of DOM manipulation
      onReplyClick(message.reply_to); // Keep for parent logic, if needed
      const originalMessage = messageRefs.current[message.reply_to];
      if (originalMessage) {
        originalMessage.scrollIntoView({ behavior: 'smooth' });
        setTempHighlightedMessageId(message.reply_to);
        setTimeout(() => {
          setTempHighlightedMessageId(null);
        }, 2000);
      }
    } else {
      onMessageClick(e, message);
    }
  };

  return (
    <div className="relative flex-1 overflow-y-auto" ref={chatContainerRef}>
      {currentDate && (
        <div className="sticky top-4 z-50 flex justify-center pointer-events-none md:w-2/3 md:mx-auto md:px-0">
          <div
            className={`px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground transition-opacity duration-300 ${
              isScrolling ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {currentDate}
          </div>
        </div>
      )}
      <div ref={ref} className="py-6 px-[10px] md:w-2/3 md:mx-auto md:px-0 space-y-4">
        {messages.map((message, index) => {
          const isMine = message.sender === username;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDateSeparator =
            !prevMessage || 
            (isValidTimestamp(message.timestamp) && 
             isValidTimestamp(prevMessage.timestamp) && 
             getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp));

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && isValidTimestamp(message.timestamp) && (
                <div
                  className="flex justify-center date-separator"
                  data-date={getFormattedDateLabel(message.timestamp)}
                >
                  <div className="px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground">
                    {getFormattedDateLabel(message.timestamp)}
                  </div>
                </div>
              )}
              <div
                ref={(el) => (messageRefs.current[message.id] = el)}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
                  highlightedMessageId === message.id ? 'highlight' : ''
                } ${contextMenuMessageId === message.id ? 'context-menu-highlight' : ''
                } ${tempHighlightedMessageId === message.id ? 'context-menu-highlight' : ''}`} // NEW: Add temp-highlight class
                onClick={(e) => handleMessageClick(e, message)}
                onContextMenu={(e) => onMessageClick(e, message)}
              >
                <div className={`flex items-end space-x-2 max-w-[200px] md:max-w-2/3 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative px-4 py-2 rounded-2xl break-words ${
                        isMine
                          ? 'bg-primary text-primary-foreground message-tail-right'
                          : 'bg-accent text-accent-foreground message-tail-left'
                      } ${message.type === 'file' ? 'max-w-[200px]' : ''}`}
                    >
                      {message.reply_to && (
                        <div
                          className={`mb-2 p-2 rounded text-sm ${
                            isMine ? 'bg-primary-darker' : 'bg-accent-darker'
                          } cursor-pointer hover:bg-opacity-70 transition-all`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // MODIFIED: Use state for highlighting
                            const originalMessage = messageRefs.current[message.reply_to];
                            if (originalMessage) {
                              originalMessage.scrollIntoView({ behavior: 'smooth' });
                              setTempHighlightedMessageId(message.reply_to);
                              setTimeout(() => {
                                setTempHighlightedMessageId(null);
                              }, 2000);
                            }
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
                      {renderContent(message)}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap mt-1">
                          {groupReactions(message.reactions).map((grouped, index) => (
                            <span
                              key={index}
                              className={`mr-2 text-sm px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${getReactionBackground(
                                isMine,
                                grouped.users,
                                grouped.reaction
                              )}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactionClick(message.id, grouped.reaction);
                              }}
                            >
                              {grouped.reaction} {grouped.count > 1 ? grouped.count : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {isValidTimestamp(message.timestamp) && (
                        <div className={`text-xs mt-1 opacity-80 select-none ${isMine ? 'text-white' : 'text-muted-foreground'}`}>
                          {getMessageTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

export default MessageList;
