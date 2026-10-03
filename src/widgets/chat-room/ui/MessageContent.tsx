import React from 'react';
import { Message } from '@/entities/message';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface MessageContentProps {
  message: Message;
  isMobile: boolean;
  translations: Record<string, any>;
  getFileTypeConfig: (fileName: string) => FileTypeConfig | undefined;
  isOwnMessage: (message: Message) => boolean;
  renderMessageContent: (message: Message) => React.ReactNode;
  isAudioPlaying: boolean;
  setPlayingMessageId: (id: number | null) => void;
}

const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isMobile,
  translations,
  getFileTypeConfig,
  isOwnMessage,
  renderMessageContent,
  isAudioPlaying,
  setPlayingMessageId,
}) => {
  if (message.type !== 'file' || typeof message.content === 'string') {
    const content = renderMessageContent(message);
    return typeof content === 'string' ? <div>{content}</div> : content;
  }

  const fileName = message.content.file_name || '';
  const fileUrl = message.content.file_url || '';
  const fullFileUrl = fileUrl.startsWith('blob:') || fileUrl.startsWith('data:') ||
    fileUrl.startsWith('http://') || fileUrl.startsWith('https://')
    ? fileUrl
    : `${BASE_URL}${fileUrl}`;
  const config = getFileTypeConfig(fileName);
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
  const audioPlayer = (
    <AudioMessage
      fileUrl={fullFileUrl}
      messageId={message.id}
      duration={audioMetadata?.duration}
      waveform={audioMetadata?.waveform}
      isPlaying={isAudioPlaying}
      setPlayingMessageId={setPlayingMessageId}
    />
  );

  if (message.content.file_type === 'voice') return withCaption(audioPlayer);
  if (config?.isSpecial && config.replyText === translations.image) {
    return withCaption(
      <ImageMessage
        fileUrl={fullFileUrl}
        thumbnailUrl={message.content.thumbnail_url ? resolveMediaUrl(message.content.thumbnail_url) : undefined}
        width={message.content.image_width}
        height={message.content.image_height}
        fileName={fileName}
        isMine={isOwnMessage(message)}
      />,
      true
    );
  }
  if (config?.isSpecial && config.replyText === translations.voiceMessage) return withCaption(audioPlayer);
  if (config) return withCaption(<FileMessage config={config} fileName={fileName} fileUrl={fullFileUrl} isMobile={isMobile} />);
  return null;
};

export default MessageContent;
