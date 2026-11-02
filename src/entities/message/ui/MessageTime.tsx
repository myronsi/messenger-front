import React from 'react';
import {
  Check, CheckCheck, Clock1, Clock2, Clock3, Clock4, Clock5, Clock6,
  Clock7, Clock8, Clock9, Clock10, Clock11, Clock12,
} from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { Message } from '../model/types';

const clockIcons = [Clock1, Clock2, Clock3, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, Clock10, Clock11, Clock12];

const UploadClockStatus: React.FC<{ progress?: number; animated: boolean }> = ({ progress, animated }) => {
  const [clockIndex, setClockIndex] = React.useState(0);
  React.useEffect(() => {
    if (!animated) return undefined;
    const interval = window.setInterval(() => setClockIndex((current) => (current + 1) % clockIcons.length), 95);
    return () => window.clearInterval(interval);
  }, [animated]);
  const ClockIcon = clockIcons[clockIndex];
  return (
    <span className="inline-flex items-center gap-0.5">
      <ClockIcon size={14} className="transition-opacity duration-75" />
      {typeof progress === 'number' && <span className="tabular-nums">{Math.max(1, Math.min(99, progress))}%</span>}
    </span>
  );
};

interface MessageTimeProps {
  message: Message;
  time: string;
  isMine: boolean;
  isGroup: boolean;
  isUploading: boolean;
  userId: EntityId;
  translations: Translations;
  onOpenReadStatus?: (message: Message) => void;
  interactive?: boolean;
}

const MessageTime: React.FC<MessageTimeProps> = ({
  message, time, isMine, isGroup, isUploading, userId, translations, onOpenReadStatus, interactive = true,
}) => {
  const status = isUploading ? <UploadClockStatus progress={message.upload_progress} animated={interactive} /> : (
    <>
      {message.read_by?.some((reader) => reader.user_id !== userId) ? <CheckCheck size={14} /> : <Check size={14} />}
      {isGroup && message.read_by?.length > 0 && <span>{message.read_by.length}</span>}
    </>
  );
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {message.edited_at && <span>{translations.edited}</span>}
      <span>{time}</span>
      {isMine && !message.delivery_error && (interactive ? (
        <button type="button" className="inline-flex items-center gap-0.5 transition-colors duration-150" onClick={(event) => {
          event.stopPropagation();
          if (isGroup) onOpenReadStatus?.(message);
        }}>
          {status}
        </button>
      ) : (
        <span className="inline-flex items-center gap-0.5">{status}</span>
      ))}
    </span>
  );
};

export default MessageTime;
