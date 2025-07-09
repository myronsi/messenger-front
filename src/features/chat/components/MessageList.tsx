import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';
import { getFileTypes, FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import ReplyPreview from './ReplyPreview';
import ReactionList from './ReactionList';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import { ArrowDownToLine } from 'lucide-react';

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
  tempHighlightedMessageId: number | null;
  setTempHighlightedMessageId: (id: number | null) => void;
}

const isValidTimestamp = (timestamp: string | undefined | null): boolean => {
  if (!timestamp) return false;
  try {
    const date = new Date(timestamp);
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
    tempHighlightedMessageId,
    setTempHighlightedMessageId,
  } = props;

  const { getFileTypeConfig } = getFileTypes();
  const { translations } = useLanguage();

  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioStates, setAudioStates] = useState<{ [key: number]: { currentTime: number; duration: number } }>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleImageClick = (fileUrl: string) => {
    setSelectedImage(fileUrl);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const renderContent = (message: Message) => {
    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const fileUrl = message.content.file_url || '';
      const fullFileUrl = `${BASE_URL}${fileUrl}`;
      const config = getFileTypeConfig(fileName);

      if (config && config.isSpecial) {
        if (config.replyText === translations.image) {
          return (
            <div className="cursor-pointer" onClick={() => handleImageClick(fullFileUrl)}>
              <ImageMessage 
                fileUrl={fullFileUrl} 
                fileName={fileName}
                isMine={message.sender === username}
              />
            </div>
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
        {messages.map((message, index) => {
          const isMine = message.sender === username;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDateSeparator =
            !prevMessage || 
            (isValidTimestamp(message.timestamp) && 
             isValidTimestamp(prevMessage.timestamp) && 
             getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(prevMessage.timestamp));
          const isImageMessage = message.type === 'file' && typeof message.content !== 'string' && getFileTypeConfig(message.content.file_name)?.replyText === translations.image;

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
                } ${tempHighlightedMessageId === message.id ? 'context-menu-highlight' : ''}`}
                onClick={(e) => handleMessageClick(e, message)}
                onContextMenu={(e) => onMessageClick(e, message)}
              >
                <div className={`flex items-end space-x-2 max-w-[350px] md:max-w-2/3 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative rounded-2xl break-words overflow-wrap-anywhere w-full max-w-[350px] md:max-w-full ${
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
                            className={`absolute bottom-1 text-xs px-2 py-1 bg-gray-500/50 rounded-xl ${
                              isMine ? 'right-1 text-white' : 'left-1 text-muted-foreground'
                            }`}
                          >
                            {getMessageTime(message.timestamp)}
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
                        />
                      )}
                      {!isImageMessage && isValidTimestamp(message.timestamp) && (
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
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
        >
          <div className="relative">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-[600px] h-[600px] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageList;
