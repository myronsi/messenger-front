import React from 'react';
import { Message } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getFileTypes } from '@/shared/contexts/fileTypesConfig';

interface ReplyPreviewProps {
  replyMessage: Message | undefined;
  isMine: boolean;
  onClick?: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyMessage, isMine, onClick }) => {
  const { translations } = useLanguage();
  const { getFileTypeConfig } = getFileTypes();

  const getReplyContent = (message: Message | undefined) => {
    if (!message) return { text: translations.messageDeleted };
    
    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const config = getFileTypeConfig(fileName);
      
      // Check if it's an image
      if (message.content.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
        return {
          text: 'Image',
          imageUrl: message.content.file_url,
          isImage: true
        };
      }
      
      if (config) {
        return { text: config.replyText };
      }
      return { text: fileName || 'File' };
    }
    return { text: typeof message.content === 'string' ? message.content : message.content.file_name || 'File' };
  };

  const content = getReplyContent(replyMessage);

  return (
    <div
      className={`mb-2 p-2 rounded text-sm ${
        isMine ? 'bg-primary-darker' : 'bg-accent-darker'
      } cursor-pointer hover:bg-opacity-70 transition-all flex items-center gap-2`}
      onClick={onClick}
    >
      {content.isImage && content.imageUrl && (
        <div className="w-8 h-8 flex-shrink-0">
          <img 
            src={content.imageUrl} 
            alt="Reply preview" 
            className="w-full h-full object-cover rounded"
            draggable={false}
          />
        </div>
      )}
      <div>
        <div className="text-gray-400 text-xs">Replying to:</div>
        {content.text}
      </div>
    </div>
  );
};

export default ReplyPreview;
