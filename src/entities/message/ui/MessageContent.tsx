import React from 'react';
import { Message } from '../model/types';
import { fileKindOf } from '../model/fileKind';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import type { Id } from '@/shared/lib/ids';


interface MessageContentProps {
  message: Message;
  isMobile: boolean;
  getFileTypeConfig: (fileName: string) => FileTypeConfig;
  isOwnMessage: (message: Message) => boolean;
  renderMessageContent: (message: Message) => React.ReactNode;
  isAudioPlaying: boolean;
  setPlayingMessageId: (id: Id | null) => void;
}

const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isMobile,
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
  // Absolute for the API's attachments (loaded with the token by MediaImg/MediaAudio/mediaFetch).
  const fullFileUrl = resolveMediaUrl(fileUrl, fileUrl);
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

  const kind = fileKindOf(message.content);
  if (kind === 'voice') return withCaption(audioPlayer);
  if (kind === 'image') {
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
  return withCaption(<FileMessage config={config} fileName={fileName} fileUrl={fullFileUrl} isMobile={isMobile} />);
};

export default MessageContent;
