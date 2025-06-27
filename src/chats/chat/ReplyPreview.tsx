import React from 'react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFileTypes } from '@/contexts/fileTypesConfig';

interface ReplyPreviewProps {
  replyMessage: Message | undefined;
  isMine: boolean;
  onClick?: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyMessage, isMine, onClick }) => {
  const { translations } = useLanguage();
  const { getFileTypeConfig } = getFileTypes();

  const getReplyContent = (message: Message | undefined) => {
    if (!message) return translations.messageDeleted;
    if (message.type === 'file' && typeof message.content !== 'string') {
      const fileName = message.content.file_name || '';
      const config = getFileTypeConfig(fileName);
      if (config) {
        return config.replyText;
      }
      return fileName || 'File';
    }
    return typeof message.content === 'string' ? message.content : message.content.file_name || 'File';
  };

  const content = getReplyContent(replyMessage);

  return (
    <div
      className={`mb-2 p-2 rounded text-sm ${
        isMine ? 'bg-primary-darker' : 'bg-accent-darker'
      } cursor-pointer hover:bg-opacity-70 transition-all`}
      onClick={onClick}
    >
      {content}
    </div>
  );
};

export default ReplyPreview;
