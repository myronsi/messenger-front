import React, { forwardRef, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Message, ReactionInfo } from '@/entities/message';
import { getFileTypes } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock1,
  Clock2,
  Clock3,
  Clock4,
  Clock5,
  Clock6,
  Clock7,
  Clock8,
  Clock9,
  Clock10,
  Clock11,
  Clock12,
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const uploadClockIcons = [Clock1, Clock2, Clock3, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, Clock10, Clock11, Clock12];

const UploadClockStatus: React.FC<{ progress?: number; showCount?: boolean; count?: number }> = ({ progress, showCount = false, count = 0 }) => {
  const [clockIndex, setClockIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockIndex((current) => (current + 1) % uploadClockIcons.length);
    }, 95);

    return () => window.clearInterval(intervalId);
  }, []);

  const ClockIcon = uploadClockIcons[clockIndex];

  return (
    <span className="inline-flex items-center gap-0.5">
      <ClockIcon size={14} className="transition-opacity duration-75" />
      {typeof progress === 'number' && <span className="tabular-nums">{Math.max(1, Math.min(99, progress))}%</span>}
      {showCount && count > 0 && <span>{count}</span>}
    </span>
  );
};

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
  onLoadNewerMessages?: () => Promise<void>;
  hasMoreMessages?: boolean;
  hasMoreNewerMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingNewerMessages?: boolean;
  isLoadingInitialMessages?: boolean;
  onMarkMessagesRead?: (messageIds: number[]) => Promise<void>;
  isGroup?: boolean;
  onOpenReadStatus?: (message: Message) => void;
  onOpenReactionDetails?: (message: Message, reaction: string, reactions: ReactionInfo[]) => void;
  onResendMessage?: (message: Message) => void;
  scrollToBottomKey?: string | number;
  onScrollStart?: () => void;
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
    onLoadNewerMessages,
    hasMoreMessages = false,
    hasMoreNewerMessages = false,
    isLoadingOlderMessages = false,
    isLoadingNewerMessages = false,
    isLoadingInitialMessages = false,
  } = props;

  const { getFileTypeConfig } = getFileTypes();
  const { translations } = useLanguage();
  const isGroup = props.isGroup || false;
  const onOpenReadStatus = props.onOpenReadStatus;
  const onOpenReactionDetails = props.onOpenReactionDetails;
  const onResendMessage = props.onResendMessage;
  const scrollToBottomKey = props.scrollToBottomKey;
  const onScrollStart = props.onScrollStart;
  const onMarkMessagesRead = props.onMarkMessagesRead;

  const isOwnMessage = (message: Message) => {
    if (message.is_own) return true;
    if (userId && message.sender_id) return message.sender_id === userId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
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
  const firstUnreadMarkerRef = useRef<HTMLDivElement | null>(null);
  const sentReadReceiptsRef = useRef<Set<number>>(new Set());
  const queuedReadReceiptsRef = useRef<Set<number>>(new Set());
  const readFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMarkMessagesReadRef = useRef(onMarkMessagesRead);
  const isRestoringScrollRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);
  const hasScrolledToFirstUnreadRef = useRef(false);
  const isSeekingFirstUnreadRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const previousScrollHeightRef = useRef(0);

  useEffect(() => {
    setVisibleFirstUnreadId(firstUnreadMessageId ?? null);
    hasScrolledToFirstUnreadRef.current = false;
  }, [firstUnreadMessageId]);

  useEffect(() => {
    onMarkMessagesReadRef.current = onMarkMessagesRead;
  }, [onMarkMessagesRead]);

  useEffect(() => {
    hasScrolledInitialRef.current = false;
    hasScrolledToFirstUnreadRef.current = false;
    isSeekingFirstUnreadRef.current = false;
    firstUnreadMarkerRef.current = null;
    shouldStickToBottomRef.current = true;
    lastMessageIdRef.current = null;
  }, [scrollToBottomKey]);

  const scrollFirstUnreadIntoView = useCallback(() => {
    const targetElement = firstUnreadMarkerRef.current || (visibleFirstUnreadId ? messageRefs.current[visibleFirstUnreadId] : null);
    if (!targetElement) return false;
    targetElement.scrollIntoView({ block: 'start' });
    shouldStickToBottomRef.current = false;
    hasScrolledInitialRef.current = true;
    hasScrolledToFirstUnreadRef.current = true;
    return true;
  }, [messageRefs, visibleFirstUnreadId]);

  useEffect(() => {
    const targetId = tempHighlightedMessageId ?? highlightedMessageId;
    if (!targetId) return;

    const targetElement = messageRefs.current[targetId];
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hasMoreMessages && !isLoadingOlderMessages && onLoadOlderMessages) {
      onLoadOlderMessages();
    }
  }, [hasMoreMessages, highlightedMessageId, isLoadingOlderMessages, messageRefs, onLoadOlderMessages, tempHighlightedMessageId, messages]);

  useEffect(() => {
    if (!visibleFirstUnreadId || isLoadingInitialMessages || hasScrolledToFirstUnreadRef.current) return;

    const targetElement = messageRefs.current[visibleFirstUnreadId];
    if (targetElement) {
      requestAnimationFrame(() => {
        scrollFirstUnreadIntoView();
      });
      return;
    }

    if (hasMoreMessages && !isLoadingOlderMessages && onLoadOlderMessages && !isSeekingFirstUnreadRef.current) {
      isSeekingFirstUnreadRef.current = true;
      onLoadOlderMessages().finally(() => {
        isSeekingFirstUnreadRef.current = false;
      });
    }
  }, [hasMoreMessages, isLoadingInitialMessages, isLoadingOlderMessages, messageRefs, messages, onLoadOlderMessages, scrollFirstUnreadIntoView, visibleFirstUnreadId]);


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

  const flushReadReceipts = async () => {
    if (!onMarkMessagesReadRef.current || queuedReadReceiptsRef.current.size === 0) return;
    const messageIds = Array.from(queuedReadReceiptsRef.current);
    queuedReadReceiptsRef.current.clear();

    try {
      await onMarkMessagesReadRef.current(messageIds);
    } catch (error) {
      messageIds.forEach((messageId) => sentReadReceiptsRef.current.delete(messageId));
    }
  };

  const queueReadReceipt = (messageId: number) => {
    if (!onMarkMessagesReadRef.current || userId <= 0) return;
    if (sentReadReceiptsRef.current.has(messageId)) return;

    sentReadReceiptsRef.current.add(messageId);
    queuedReadReceiptsRef.current.add(messageId);
    if (readFlushTimeoutRef.current) {
      clearTimeout(readFlushTimeoutRef.current);
    }
    readFlushTimeoutRef.current = setTimeout(() => {
      readFlushTimeoutRef.current = null;
      flushReadReceipts();
    }, 500);
  };

  const markVisibleMessagesAsRead = () => {
    messages.forEach((message) => {
      if (!isOwnMessage(message) && !message.read_by?.some((r) => r.user_id === userId)) {
        const el = messageRefs.current[message.id];
        if (el && isElementInViewport(el, chatContainerRef.current)) {
          console.log(`Marking message ${message.id} as read for user ${userId}`);
          queueReadReceipt(message.id);
        }
      }
    });
  };

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
            const message = messages.find((msg) => msg.id === messageId);
            if (message && !isOwnMessage(message) && !message.read_by?.some((r) => r.user_id === userId)) {
              console.log(`IntersectionObserver: queueing message ${messageId} as read for user ${userId}`);
              queueReadReceipt(messageId);
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

    return () => {
      observerRef.current?.disconnect();
    };
  }, [messages, username, userId, messageRefs]);

  useEffect(() => () => {
    if (readFlushTimeoutRef.current) {
      clearTimeout(readFlushTimeoutRef.current);
      readFlushTimeoutRef.current = null;
    }
    flushReadReceipts();
  }, []);

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
      onScrollStart?.();

      const container = chatContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 160;
        shouldStickToBottomRef.current = !visibleFirstUnreadId && isNearBottom;
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

      if (
        container &&
        container.scrollHeight - container.scrollTop - container.clientHeight <= 160 &&
        hasMoreNewerMessages &&
        !isLoadingNewerMessages &&
        onLoadNewerMessages
      ) {
        await onLoadNewerMessages();
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
  }, [messages, getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingOlderMessages, isLoadingNewerMessages, onLoadOlderMessages, onLoadNewerMessages, onScrollStart]);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const lastMessageId = messages[messages.length - 1]?.id || null;
    if (!container || !lastMessageId || isRestoringScrollRef.current) {
      previousScrollHeightRef.current = container?.scrollHeight || 0;
      lastMessageIdRef.current = lastMessageId;
      return;
    }

    const previousScrollHeight = previousScrollHeightRef.current;
    const scrollHeightDelta = container.scrollHeight - previousScrollHeight;
    const isSameLastMessage = lastMessageIdRef.current === lastMessageId;
    if (isSameLastMessage && scrollHeightDelta !== 0) {
      if (shouldStickToBottomRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    }

    if (
      !hasScrolledInitialRef.current &&
      visibleFirstUnreadId &&
      !messageRefs.current[visibleFirstUnreadId] &&
      hasMoreMessages
    ) {
      shouldStickToBottomRef.current = false;
      previousScrollHeightRef.current = container.scrollHeight;
      lastMessageIdRef.current = lastMessageId;
      return;
    }

	    if (!hasScrolledInitialRef.current) {
	      const shouldPreferFirstUnread = !!visibleFirstUnreadId;
	      const forceInitialScroll = () => {
	        const nextContainer = chatContainerRef.current;
	        if (!nextContainer || isRestoringScrollRef.current) return;
	        if (hasScrolledInitialRef.current && !shouldStickToBottomRef.current && !visibleFirstUnreadId) return;
	        if (visibleFirstUnreadId && scrollFirstUnreadIntoView()) {
	          return;
	        }
	        if (shouldPreferFirstUnread) {
	          shouldStickToBottomRef.current = false;
	          return;
	        }
	        nextContainer.scrollTop = nextContainer.scrollHeight;
	        shouldStickToBottomRef.current = true;
	      };

      forceInitialScroll();
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        forceInitialScroll();
        secondFrame = requestAnimationFrame(forceInitialScroll);
      });
      const settleTimeout = window.setTimeout(forceInitialScroll, 120);
      const mediaSettleTimeout = window.setTimeout(forceInitialScroll, 400);

      hasScrolledInitialRef.current = true;
      lastMessageIdRef.current = lastMessageId;

      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        window.clearTimeout(settleTimeout);
        window.clearTimeout(mediaSettleTimeout);
      };
    }

    if (lastMessageIdRef.current !== lastMessageId && shouldStickToBottomRef.current) {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
      scrollAnimationFrameRef.current = requestAnimationFrame(() => {
        const nextContainer = chatContainerRef.current;
        if (!nextContainer || isRestoringScrollRef.current) return;
        nextContainer.scrollTo({ top: nextContainer.scrollHeight, behavior: 'smooth' });
        scrollAnimationFrameRef.current = null;
      });
    }

    lastMessageIdRef.current = lastMessageId;
    previousScrollHeightRef.current = container.scrollHeight;

    return () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
    };
  }, [messages, scrollToBottomKey, visibleFirstUnreadId, messageRefs, scrollFirstUnreadIntoView]);

  const isMessageDeletedForMe = (message: Message): boolean => {
    if (!message.deleted_for || !Array.isArray(message.deleted_for)) return false;
    return message.deleted_for.includes(userId);
  };

  const renderContent = (message: Message) => {
    // Show placeholder for deleted messages in group chats
    if (isMessageDeletedForMe(message)) {
      if (isGroup) {
        return (
          <div className="italic opacity-70 text-sm">
            [{translations.deleted || 'Deleted'} {translations.forYou || 'for you'}]
          </div>
        );
      }
      // For 1-on-1 chats, return early so message won't be rendered
      return null;
    }

    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const fileUrl = message.content.file_url || '';
      const fullFileUrl = fileUrl.startsWith('blob:') || fileUrl.startsWith('data:') || fileUrl.startsWith('http://') || fileUrl.startsWith('https://')
        ? fileUrl
        : `${BASE_URL}${fileUrl}`;
      const config = getFileTypeConfig(fileName);
      const isVoiceMessage = message.content.file_type === 'voice';
      const audioMetadata = message.content.audio_metadata;
      const caption = message.content.caption?.trim();
      const withCaption = (content: React.ReactNode, isImage = false) => (
        <>
          {content}
          {caption && (
            <div className={`whitespace-pre-wrap text-sm leading-snug ${isImage ? 'px-3 pb-2 pt-1' : 'mt-2'}`}>
              {caption}
            </div>
          )}
        </>
      );

      if (isVoiceMessage) {
        return withCaption(
          <AudioMessage
            fileUrl={fullFileUrl}
            messageId={message.id}
            duration={audioMetadata?.duration}
            waveform={audioMetadata?.waveform}
            playingMessageId={playingMessageId}
            setPlayingMessageId={setPlayingMessageId}
            audioStates={audioStates}
            setAudioStates={setAudioStates}
          />
        );
      }

      if (config && config.isSpecial) {
        if (config.replyText === translations.image) {
          return withCaption(
            <ImageMessage 
              fileUrl={fullFileUrl} 
              fileName={fileName}
              isMine={isOwnMessage(message)}
            />,
            true
          );
        } else if (config.replyText === translations.voiceMessage) {
          return withCaption(
            <AudioMessage
              fileUrl={fullFileUrl}
              messageId={message.id}
              duration={audioMetadata?.duration}
              waveform={audioMetadata?.waveform}
              playingMessageId={playingMessageId}
              setPlayingMessageId={setPlayingMessageId}
              audioStates={audioStates}
              setAudioStates={setAudioStates}
            />
          );
        }
      } else if (config) {
        return withCaption(
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

  const getMessageSenderKey = (message: Message) => {
    if (isOwnMessage(message)) return 'own';
    if (message.sender_id) return `id:${message.sender_id}`;
    const senderName = message.sender_username || message.sender || '';
    return `name:${senderName.toLowerCase()}`;
  };

  const hasDateBoundary = (message: Message, adjacentMessage: Message) => (
    isValidTimestamp(message.timestamp) &&
    isValidTimestamp(adjacentMessage.timestamp) &&
    getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(adjacentMessage.timestamp)
  );

  const isSameMessageSender = (message: Message, adjacentMessage: Message) => (
    getMessageSenderKey(message) === getMessageSenderKey(adjacentMessage)
  );

  const getForwardedLabel = (message: Message) => {
    const forwardedFrom = message.forwarded_from;
    if (!forwardedFrom) return null;
    const sender = forwardedFrom.sender_name || forwardedFrom.sender_username || translations.deletedUser || 'Deleted User';
    const template = translations.forwardedFrom || 'Forwarded from {sender}';
    return template.replace('{sender}', sender);
  };

  return (
    <div className="relative flex-1 overflow-y-auto overflow-anchor-none" ref={chatContainerRef}>
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
      <div ref={ref} className="px-[10px] pt-6 pb-32 md:w-2/3 md:mx-auto md:px-0 md:pb-36 space-y-4">
        {isLoadingOlderMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
        {!isLoadingInitialMessages && messages.length === 0 && (
          <div className="flex h-[55vh] items-center justify-center text-sm text-muted-foreground">
            {translations.noMessagesYet || 'No messages yet'}
          </div>
        )}
        {messages.map((message, index) => {
          // In 1-on-1 chats, completely hide messages deleted for me
          // In group chats, show a placeholder
          if (isMessageDeletedForMe(message) && !isGroup) {
            return null; // Skip rendering in 1-on-1 chats
          }

          const isMine = isOwnMessage(message);
          const isOutgoingSend = isMine && (message.id < 0 || !!message.client_temp_id);
          const isUploadingMessage = isMine && message.upload_status === 'uploading';
          const messageRenderKey = message.client_temp_id ?? message.id;
          const hasReactions = !!message.reactions?.length;
          const showNewMessagesMarker = visibleFirstUnreadId === message.id && !isMine;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
          const showDateSeparator =
            !prevMessage || 
            (isValidTimestamp(message.timestamp) && 
             isValidTimestamp(prevMessage.timestamp) && 
             getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp));
          const isImageMessage = message.type === 'file' && typeof message.content !== 'string' && getFileTypeConfig(message.content.file_name)?.replyText === translations.image;
          const nextIsMine = nextMessage ? isOwnMessage(nextMessage) : false;
          const groupedWithPrevious = !!prevMessage &&
            isSameMessageSender(message, prevMessage) &&
            !showDateSeparator &&
            !showNewMessagesMarker;
          const groupedWithNext = !!nextMessage &&
            isSameMessageSender(message, nextMessage) &&
            !hasDateBoundary(message, nextMessage) &&
            !(visibleFirstUnreadId === nextMessage.id && !nextIsMine);
          const isFirstInGroup = !groupedWithPrevious;
          const isLastInGroup = !groupedWithNext;
          const showSenderName = isGroup && !isMine && isFirstInGroup;
          const reserveAvatarSpace = isGroup && !isMine;
          const showAvatar = reserveAvatarSpace && isLastInGroup;
          const showTail = isLastInGroup && !isImageMessage;

          return (
            <React.Fragment key={messageRenderKey}>
              {showNewMessagesMarker && (
                <div ref={firstUnreadMarkerRef} className="scroll-mt-2 flex justify-center">
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
                className={`${isOutgoingSend ? 'motion-message-send' : 'motion-message'} flex ${isMine ? 'justify-end' : 'justify-start'} ${
                  highlightedMessageId === message.id ? 'highlight' : ''
                } ${contextMenuMessageId === message.id ? 'context-menu-highlight' : ''
                } ${tempHighlightedMessageId === message.id ? 'context-menu-highlight' : ''}`}
                style={groupedWithPrevious ? { marginTop: '0.25rem' } : undefined}
                onClick={(e) => handleMessageClick(e, message)}
                onContextMenu={(e) => onMessageClick(e, message)}
              >
                <div className={`flex items-end space-x-2 max-w-[350px] md:max-w-2/3 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {showAvatar && (
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
                  {reserveAvatarSpace && !showAvatar && <div className="h-8 w-8 shrink-0" aria-hidden="true" />}
                  <div className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {showSenderName && (
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
                          ? 'bg-primary text-primary-foreground' + (showTail ? ' message-tail-right' : '')
                          : 'bg-accent text-accent-foreground' + (showTail ? ' message-tail-left' : '')
                      } ${isImageMessage 
                          ? 'p-0 border' + (isMine ? ' border-primary' : ' border-accent')
                          : 'px-4 py-2 border' + (isMine ? ' border-primary' : ' border-accent')} ${
                        hasReactions ? (isImageMessage ? 'mb-4' : 'mb-3.5') : ''
                      }`}
                    >
                      {getForwardedLabel(message) && (
                        <div className="mb-1 text-xs font-medium opacity-70">
                          {getForwardedLabel(message)}
                        </div>
                      )}
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
                                {isUploadingMessage ? (
                                  <UploadClockStatus progress={message.upload_progress} />
                                ) : (
                                  <>
                                    {message.read_by?.some((r) => r.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
                                    {isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
                                  </>
                                )}
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
                          isImage={isImageMessage}
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
                              {isUploadingMessage ? (
                                <UploadClockStatus progress={message.upload_progress} />
                              ) : (
                                <>
                                  {message.read_by?.some((r) => r.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
                                  {isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
                                </>
                              )}
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
        {isLoadingNewerMessages && (
          <div className="flex justify-center">
            <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
              {translations.loading}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageList;
