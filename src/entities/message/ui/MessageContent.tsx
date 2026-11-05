import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import React from 'react';
import { Message } from '../model/types';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import { LinkedMessageText } from './LinkedMessageText';
import { MessageTextBody } from './MessageTextBody';
import LinkPreviewCard from './LinkPreviewCard';
import { messageLinks } from '@/shared/lib/messageLinks';



interface MessageContentProps {
  message: Message;
  isMobile: boolean;
  translations: Translations;
  getFileTypeConfig: (fileName: string) => FileTypeConfig | undefined;
  isOwnMessage: (message: Message) => boolean;
  renderMessageContent: (message: Message) => React.ReactNode;
  isAudioPlaying: boolean;
  setPlayingMessageId: (id: EntityId | null, endedId?: EntityId) => void;
  trailing?: React.ReactNode;
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
  trailing,
}) => {
  if (message.type !== 'file' || typeof message.content === 'string') {
    const content = renderMessageContent(message);
    if (typeof content !== 'string') return <>{content}{trailing}</>;
    const link = message.is_deleted || message.system_event ? undefined : messageLinks(content).find((part) => part.href)?.href;
    return (
      <>
        <MessageTextBody text={content} trailing={trailing} />
        {link && <LinkPreviewCard url={link} isMine={isOwnMessage(message)} />}
      </>
    );
  }

  const fileName = message.content.file_name || '';
  const fileUrl = message.content.file_url || '';
  const fullFileUrl = resolveMediaUrl(fileUrl);
  const config = getFileTypeConfig(fileName);
  const audioMetadata = message.content.audio_metadata;
  const caption = message.content.caption?.trim();
  const withCaption = (content: React.ReactNode, isImage = false) => (
    <>
      {content}
      {caption && (
        <div data-testid="message-caption" className={`whitespace-pre-wrap text-sm leading-snug ${isImage ? 'w-0 min-w-full px-3 pb-2 pt-1' : 'mt-2'}`}>
          <LinkedMessageText text={caption} />
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
      isMine={isOwnMessage(message)}
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
        viewerInfo={{
          sender: isOwnMessage(message) ? translations.replyFromYou : message.sender,
          avatarName: message.sender, avatarUrl: message.avatar_url, sentAt: message.timestamp,
        }}
      />,
      true
    );
  }
  if (config?.isSpecial && config.replyText === translations.voiceMessage) return withCaption(audioPlayer);
  if (config) return withCaption(<FileMessage config={config} fileName={fileName} fileUrl={fullFileUrl} isMobile={isMobile} />);
  return null;
};

export default MessageContent;
