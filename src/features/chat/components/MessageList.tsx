import React, { forwardRef, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Message, ReactionInfo } from '@/entities/message';
import { getFileTypes, FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import { AlertCircle, Check, CheckCheck } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface MessageListProps {
  messages: Message[];
  username: string;
  userId: number;
  interlocutorDeleted: boolean;
  firstUnreadMessageId?: number | null;
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
  tempHighlightedMessageId: number | null;
  setTempHighlightedMessageId: (id: number | null) => void;
  onLoadOlderMessages?: () => Promise<void>;
  hasMoreMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingInitialMessages?: boolean;
  isGroup?: boolean;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
  scrollToBottomKey?: string | number;
}

const isValidTimestamp = (timestamp: string | undefined | null): boolean => {
  if (!timestamp) return false;
  try {
    const date = parseUtcDate(timestamp);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

interface FileMessageProps {
  config: FileTypeConfig;
  fileName: string;
  fileUrl: string;
  isMobile: boolean;
}

const FileMessage: React.FC<FileMessageProps> = ({ config, fileName, fileUrl, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const handleDownload = async () => {
    try {
      const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(downloadBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const IconComponent = isMobile ? config.onHover : (isHovered ? config.onHover : config.icon);

  return (
    <div
      className="file-message flex items-center space-x-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button onClick={handleDownload} className="focus:outline-none">
        <IconComponent size={20} className="cursor-pointer" />
      </button>
      <span className="truncate max-w-[calc(100%-28px)]" title={fileName}>
        {fileName}
      </span>
    </div>
  );
};

const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => {
  const {
    messages,
    username,
    userId,
    interlocutorDeleted,
    firstUnreadMessageId,
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
    onOpenReactionMenu,
    tempHighlightedMessageId,
    setTempHighlightedMessageId,
    onLoadOlderMessages,
    hasMoreMessages = false,
    isLoadingOlderMessages = false,
    isLoadingInitialMessages = false,
  } = props;

  const { getFileTypeConfig } = getFileTypes();
  const { translations } = useLanguage();
  const isGroup = props.isGroup || false;
  const onOpenReadStatus = props.onOpenReadStatus;
  const onOpenReactionDetails = props.onOpenReactionDetails;
  const onResendMessage = props.onResendMessage;
  const scrollToBottomKey = props.scrollToBottomKey;

  const isOwnMessage = (message: Message) => {
    return userId ? message.sender_id === userId : message.sender === username;
  };

  const getAvatarSrc = (avatarUrl?: string | null) => {
    if (!avatarUrl) return `${BASE_URL}/static/avatars/default.jpg`;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl}`;
  };

  const getProfileUsername = (message: Message) => {
    return message.sender_username || message.sender;
  };

  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [visibleFirstUnreadId, setVisibleFirstUnreadId] = useState<number | null>(firstUnreadMessageId ?? null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioStates, setAudioStates] = useState<{ [key: number]: { currentTime: number; duration: number } }>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentReadReceiptsRef = useRef<Set<number>>(new Set());
  const isRestoringScrollRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    setVisibleFirstUnreadId(firstUnreadMessageId ?? null);
  }, [firstUnreadMessageId]);

  useEffect(() => {
    hasScrolledInitialRef.current = false;
    shouldStickToBottomRef.current = true;
    lastMessageIdRef.current = null;
  }, [scrollToBottomKey]);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isElementInViewport = (el: HTMLElement, container: HTMLElement | null) => {
    if (!el || !container) return false;
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return (
      rect.top >= containerRect.top &&
      rect.bottom <= containerRect.bottom &&
      rect.left >= containerRect.left &&
      rect.right <= containerRect.right
    );
  };

  const sendReadReceipt = (messageId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || userId <= 0) return;
    if (sentReadReceiptsRef.current.has(messageId)) return;

    sentReadReceiptsRef.current.add(messageId);
    wsRef.current.send(JSON.stringify({ type: 'is_read', message_id: messageId }));
  };

  const markVisibleMessagesAsRead = () => {
    messages.forEach((message) => {
      if (!isOwnMessage(message) && !message.read_by?.some((r) => r.user_id === userId)) {
        const el = messageRefs.current[message.id];
        if (el && isElementInViewport(el, chatContainerRef.current)) {
          console.log(`Marking message ${message.id} as read for user ${userId}`);
          sendReadReceipt(message.id);
        }
      }
    });
  };

  useEffect(() => {
    if (!wsRef.current) return;
    const socket = wsRef.current;

    const handleWebSocketOpen = () => {
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
              const message = messages.find((msg) => msg.id === messageId);
              if (message && !isOwnMessage(message) && !message.read_by?.some((r) => r.user_id === userId)) {
                console.log(`IntersectionObserver: Marking message ${messageId} as read for user ${userId}`);
                sendReadReceipt(messageId);
              }
            }
          });
        },
        { threshold: 0.5, root: chatContainerRef.current }
      );

      Object.values(messageRefs.current).forEach((el) => {
        if (el) {
          el.setAttribute('data-message-id', el.getAttribute('data-message-id') || '');
          observerRef.current?.observe(el);
        }
      });

      requestAnimationFrame(() => {
        markVisibleMessagesAsRead();
      });
    };

    if (wsRef.current.readyState === WebSocket.OPEN) {
      handleWebSocketOpen();
    } else {
      socket.addEventListener('open', handleWebSocketOpen);
    }

    return () => {
      observerRef.current?.disconnect();
      socket.removeEventListener('open', handleWebSocketOpen);
    };
  }, [messages, username, userId, wsRef]);

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
    const handleScroll = async () => {
      const container = chatContainerRef.current;
      if (container) {
        shouldStickToBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 160;
      }

      if (
        container &&
        container.scrollTop <= 120 &&
        hasMoreMessages &&
        !isLoadingOlderMessages &&
        !isRestoringScrollRef.current &&
        onLoadOlderMessages
      ) {
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;
        isRestoringScrollRef.current = true;
        await onLoadOlderMessages();
        requestAnimationFrame(() => {
          const nextContainer = chatContainerRef.current;
          if (nextContainer) {
            nextContainer.scrollTop = nextContainer.scrollHeight - previousScrollHeight + previousScrollTop;
          }
          isRestoringScrollRef.current = false;
        });
      }

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
  }, [messages, getFormattedDateLabel, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages]);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const lastMessageId = messages[messages.length - 1]?.id || null;
    if (!container || !lastMessageId || isRestoringScrollRef.current) {
      lastMessageIdRef.current = lastMessageId;
      return;
    }

    if (!hasScrolledInitialRef.current) {
      const forceScrollToBottom = () => {
        const nextContainer = chatContainerRef.current;
        if (!nextContainer || isRestoringScrollRef.current) return;
        if (hasScrolledInitialRef.current && !shouldStickToBottomRef.current) return;
        nextContainer.scrollTop = nextContainer.scrollHeight;
      };

      forceScrollToBottom();
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        forceScrollToBottom();
        secondFrame = requestAnimationFrame(forceScrollToBottom);
      });
      const settleTimeout = window.setTimeout(forceScrollToBottom, 120);
      const mediaSettleTimeout = window.setTimeout(forceScrollToBottom, 400);

      hasScrolledInitialRef.current = true;
      shouldStickToBottomRef.current = true;
      lastMessageIdRef.current = lastMessageId;

      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        window.clearTimeout(settleTimeout);
        window.clearTimeout(mediaSettleTimeout);
      };
    }

    if (lastMessageIdRef.current !== lastMessageId && shouldStickToBottomRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    lastMessageIdRef.current = lastMessageId;
  }, [messages, scrollToBottomKey]);

  const renderContent = (message: Message) => {
    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const fileUrl = message.content.file_url || '';
      const fullFileUrl = `${BASE_URL}${fileUrl}`;
      const config = getFileTypeConfig(fileName);

      if (config && config.isSpecial) {
        if (config.replyText === translations.image) {
          return (
            <ImageMessage 
              fileUrl={fullFileUrl} 
              fileName={fileName}
              isMine={isOwnMessage(message)}
            />
          );
        } else if (config.replyText === translations.voiceMessage) {
          return (
            <AudioMessage
              fileUrl={fullFileUrl}
              messageId={message.id}
              playingMessageId={playingMessageId}
              setPlayingMessageId={setPlayingMessageId}
              audioStates={audioStates}
              setAudioStates={setAudioStates}
            />
          );
        }
      } else if (config) {
        return (
          <FileMessage
            config={config}
            fileName={fileName}
            fileUrl={fullFileUrl}
            isMobile={isMobile}
          />
        );
      }
    }
    return renderMessageContent(message);
  };

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    if (message.reply_to && e.type === 'click' && !interlocutorDeleted) {
      onReplyClick(message.reply_to);
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
        <div className="sticky pt-0.5 top-0 z-50 flex justify-center pointer-events-none md:w-2/3 md:mx-auto md:px-0">
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
        {isLoadingInitialMessages && messages.length === 0 && (
          <div className="flex h-[55vh] items-center justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
        {isLoadingOlderMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
        {messages.map((message, index) => {
          const isMine = isOwnMessage(message);
          const showNewMessagesMarker = visibleFirstUnreadId === message.id && !isMine;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDateSeparator =
            !prevMessage || 
            (isValidTimestamp(message.timestamp) && 
             isValidTimestamp(prevMessage.timestamp) && 
             getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp));
          const isImageMessage = message.type === 'file' && typeof message.content !== 'string' && getFileTypeConfig(message.content.file_name)?.replyText === translations.image;

          return (
            <React.Fragment key={message.id}>
              {showNewMessagesMarker && (
                <div className="flex justify-center">
                  <div className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                    {translations.newMessages}
                  </div>
                </div>
              )}
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
                ref={(el) => {
                  messageRefs.current[message.id] = el;
                  if (el && observerRef.current) {
                    el.setAttribute('data-message-id', message.id.toString());
                    observerRef.current.observe(el);
                  }
                }}
                className={`motion-message flex ${isMine ? 'justify-end' : 'justify-start'} ${
                  highlightedMessageId === message.id ? 'highlight' : ''
                } ${contextMenuMessageId === message.id ? 'context-menu-highlight' : ''
                } ${tempHighlightedMessageId === message.id ? 'context-menu-highlight' : ''}`}
                onClick={(e) => handleMessageClick(e, message)}
                onContextMenu={(e) => onMessageClick(e, message)}
              >
                <div className={`flex items-end space-x-2 max-w-[350px] md:max-w-2/3 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {isGroup && !isMine && (
                    <button
                      type="button"
                      className="mb-1 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAvatarClick(getProfileUsername(message));
                      }}
                    >
                      <img
                        src={getAvatarSrc(message.avatar_url)}
                        alt={message.sender}
                        className="motion-avatar h-8 w-8 rounded-full object-cover transition-opacity hover:opacity-80"
                      />
                    </button>
                  )}
                  <div className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {isGroup && !isMine && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAvatarClick(getProfileUsername(message));
                        }}
                        className="motion-press mb-1 max-w-[220px] truncate rounded px-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {message.sender}
                      </button>
                    )}
                    <div
                      className={`motion-message-bubble relative rounded-2xl break-words overflow-wrap-anywhere w-full max-w-[350px] md:max-w-full ${
                        isMine
                          ? 'bg-primary text-primary-foreground' + (isImageMessage ? '' : ' message-tail-right')
                          : 'bg-accent text-accent-foreground' + (isImageMessage ? '' : ' message-tail-left')
                      } ${isImageMessage 
                          ? 'p-0 border' + (isMine ? ' border-primary' : ' border-accent')
                          : 'px-4 py-2 border' + (isMine ? ' border-primary' : ' border-accent')}`}
                    >
                      {message.reply_to && (
                        <ReplyPreview
                          replyMessage={messages.find((m) => m.id === message.reply_to)}
                          isMine={isMine}
                          onClick={() => {
                            const originalMessage = messageRefs.current[message.reply_to];
                            if (originalMessage) {
                              originalMessage.scrollIntoView({ behavior: 'smooth' });
                              setTempHighlightedMessageId(message.reply_to);
                              setTimeout(() => {
                                setTempHighlightedMessageId(null);
                              }, 2000);
                            }
                          }}
                        />
                      )}
                      <div className="relative">
                        {renderContent(message)}
                        {isImageMessage && isValidTimestamp(message.timestamp) && (
                          <div
                            className={`absolute bottom-1 text-[10px] px-2 py-1 bg-gray-500/50 rounded-xl flex items-center space-x-1 ${
                              isMine ? 'right-1 text-white' : 'left-1 text-muted-foreground'
                            }`}
                          >
                            {message.edited_at && <span>{translations.edited}</span>}
                            <span>{getMessageTime(message.timestamp)}</span>
                            {isMine && !message.delivery_error && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-0.5"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (isGroup) onOpenReadStatus?.(message);
                                }}
                              >
                                {message.read_by?.some((r) => r.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
                                {isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {message.reactions && message.reactions.length > 0 && (
                        <ReactionList
                          reactions={message.reactions}
                          messageId={message.id}
                          userId={userId}
                          isMine={isMine}
                          wsRef={wsRef}
                          onOpenReactionDetails={(reaction, reactions) => onOpenReactionDetails?.(message, reaction, reactions)}
                        />
                      )}
                      {!isImageMessage && isValidTimestamp(message.timestamp) && (
                        <div className={`text-[10px] mt-1 opacity-80 select-none flex items-center space-x-1 ${isMine ? 'text-white' : 'text-muted-foreground'}`}>
                          {message.edited_at && <span>{translations.edited}</span>}
                          <span>{getMessageTime(message.timestamp)}</span>
                          {isMine && !message.delivery_error && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-0.5"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isGroup) onOpenReadStatus?.(message);
                              }}
                            >
                              {message.read_by?.some((r) => r.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
                              {isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
                            </button>
                          )}
                        </div>
                      )}
                      {message.delivery_error && (
                        <div
                          className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug ${
                            isMine ? 'text-red-100' : 'text-red-600'
                          }`}
                        >
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{message.delivery_error}</span>
                          {isMine && onResendMessage && (
                            <button
                              type="button"
                              className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium underline-offset-2 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                onResendMessage(message);
                              }}
                            >
                              {translations.resend || 'Resend'}
                            </button>
                          )}
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
