import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import React from 'react';
import { Message } from '../model/types';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { FileTypeConfig, genericFileType } from '@/shared/contexts/fileTypesConfig';
import AudioMessage from './AudioMessage';
import ImageMessage from './ImageMessage';
import AlbumMessage from './AlbumMessage';
import { attachmentView, isVoiceAttachment } from '../model/videoAttachment';
import { UploadProgressRing } from './UploadProgress';
import FileMessage from './FileMessage';
import { LinkedMessageText } from './LinkedMessageText';
import { MessageTextBody } from './MessageTextBody';
import LinkPreviewCard from './LinkPreviewCard';
import { messageLinks } from '@/shared/lib/messageLinks';
import { useImageDrawing } from '@/shared/ui/drawing';
import { drawActionFor } from '../model/drawAction';
import { StickerMessage } from './StickerMessage';

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
  mediaBroken?: boolean;
  onMediaBroken?: () => void;
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
  mediaBroken = false,
  onMediaBroken,
}) => {
  const imageDrawing = useImageDrawing();
  if (message.sticker && !message.is_deleted && !mediaBroken) return <StickerMessage sticker={message.sticker} onBroken={onMediaBroken} />;
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
  const viewerInfo = {
    sender: isOwnMessage(message) ? translations.replyFromYou : message.sender,
    avatarName: message.sender, avatarUrl: message.avatar_url, sentAt: message.timestamp,
  };
  const uploadProgress = message.upload_status === 'uploading' ? message.upload_progress ?? 0 : undefined;
  if (message.content.album?.length) {
    return withCaption(
      <div className="relative w-fit max-w-full">
        <AlbumMessage messageId={message.id} items={message.content.album} viewerInfo={viewerInfo} />
        {uploadProgress !== undefined && <UploadProgressRing progress={uploadProgress} />}
      </div>,
      true,
    );
  }

  const isPictureName = !!config?.isSpecial && config.replyText === translations.image;
  const view = attachmentView(message.content, isPictureName);
  if (view === 'audio') {
    return withCaption(
      <>
        {!isVoiceAttachment(message.content) && fileName && (
          <div data-testid="audio-file-name" className="mb-0.5 max-w-[260px] truncate text-xs font-medium opacity-90" title={fileName}>{fileName}</div>
        )}
        <AudioMessage
          fileUrl={fullFileUrl}
          messageId={message.id}
          duration={audioMetadata?.duration}
          waveform={audioMetadata?.waveform}
          isPlaying={isAudioPlaying}
          isMine={isOwnMessage(message)}
          setPlayingMessageId={setPlayingMessageId}
        />
      </>,
    );
  }

  const isVideo = !!fileUrl && view === 'video';
  const isPicture = view === 'image';
  const fileMessage = (
    <FileMessage config={config ?? genericFileType(translations.genericFile)} fileName={fileName} fileUrl={fullFileUrl} isMobile={isMobile}
      fileSize={message.content.file_size} uploadProgress={uploadProgress} />
  );
  if ((mediaBroken && isPicture) || !(isVideo || isPicture)) return withCaption(fileMessage);
  return withCaption(
    <ImageMessage
      fileUrl={fullFileUrl}
      thumbnailUrl={message.content.thumbnail_url ? resolveMediaUrl(message.content.thumbnail_url) : undefined}
      width={message.content.image_width}
      height={message.content.image_height}
      fileName={fileName}
      isMine={isOwnMessage(message)}
      isVideo={isVideo}
      onBroken={onMediaBroken}
      viewerInfo={viewerInfo}
      drawing={message.content.drawing}
      onDraw={isVideo ? undefined : drawActionFor(imageDrawing, message.id, message.content, fullFileUrl)}
      uploadProgress={uploadProgress}
    />,
    true
  );
};

export default MessageContent;
