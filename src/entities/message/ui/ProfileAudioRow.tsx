import React from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import AudioMessage from './AudioMessage';
import type { ProfileAudioItem } from './ProfileChatPanels';
import type { AudioTrack } from '../model/audioPlayer';
import { TrackMenu } from './TrackMenu';

interface ProfileAudioRowProps {
  audio: ProfileAudioItem;
  track?: AudioTrack;
  isMine: boolean;
  onPlay: (startAt?: number) => void;
  onShowInChat?: () => void;
}

const ProfileAudioRow: React.FC<ProfileAudioRowProps> = ({ audio, track, isMine, onPlay, onShowInChat }) => {
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
          isMine={isMine}
          variant={audio.kind === 'voice' ? 'voice' : 'music'}
          onPlay={onPlay}
        />
      </div>
      <div className="mt-1 flex max-w-full items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{[sender, when].filter(Boolean).join(' · ')}</span>
        {onShowInChat && (
          <button type="button" onClick={onShowInChat} className="shrink-0 font-medium text-primary hover:underline">{translations.showInChat}</button>
        )}
        {track && <TrackMenu track={track} className="-my-1 h-7 w-7" />}
      </div>
    </div>
  );
};

export default ProfileAudioRow;
