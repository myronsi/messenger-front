import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import AudioMessage from './AudioMessage';
import type { ProfileAudioItem } from './ProfileChatPanels';

interface ProfileAudioRowProps {
  audio: ProfileAudioItem;
  isMine: boolean;
  isPlaying: boolean;
  setPlayingMessageId: (id: EntityId | null, endedId?: EntityId) => void;
  onShowInChat?: () => void;
}

const ProfileAudioRow: React.FC<ProfileAudioRowProps> = ({ audio, isMine, isPlaying, setPlayingMessageId, onShowInChat }) => {
  const { translations, language } = useLanguage();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sender = isMine ? translations.replyFromYou : audio.sender;
  const when = audio.timestamp ? `${formatDateLabel(audio.timestamp, language, today, yesterday)}, ${formatTime(audio.timestamp, language)}` : '';

  return (
    <div data-testid="profile-audio" className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      <div className={`w-fit max-w-full rounded-bubble px-3 py-1.5 ${isMine ? 'bubble-out bg-primary text-primary-foreground' : 'bubble-in bg-accent text-accent-foreground'}`}>
        {audio.kind === 'file' && <div className="mb-0.5 max-w-[260px] truncate text-xs font-medium opacity-90">{audio.name}</div>}
        <AudioMessage
          fileUrl={audio.url}
          messageId={audio.id}
          duration={audio.duration}
          waveform={audio.waveform}
          isPlaying={isPlaying}
          isMine={isMine}
          setPlayingMessageId={setPlayingMessageId}
        />
      </div>
      <div className="mt-1 flex max-w-full items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{[sender, when].filter(Boolean).join(' · ')}</span>
        {onShowInChat && (
          <button type="button" onClick={onShowInChat} className="shrink-0 font-medium text-primary hover:underline">{translations.showInChat}</button>
        )}
      </div>
    </div>
  );
};

export default ProfileAudioRow;
