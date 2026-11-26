import type { ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { trackSubtitle, useAudioPlayer, type AudioTrack } from '@/entities/message';
import { cn } from '@/shared/lib/utils';
import { TrackCover } from './TrackCover';

interface TrackRowProps {
  track: AudioTrack;
  onPlay: () => void;
  actions?: ReactNode;
}

export const TrackRow = ({ track, onPlay, actions }: TrackRowProps) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const current = useAudioPlayer((player) => !!player.track && String(player.track.id) === String(track.id));
  const playing = useAudioPlayer((player) => player.playing);
  const unavailable = !!track.unavailable;
  const subtitle = unavailable ? t.unavailable : trackSubtitle(track, t.fromName);
  return (
    <li className="flex h-14 items-center gap-1 pl-3 pr-1" data-unavailable={unavailable || undefined}>
      <button type="button" onClick={onPlay} aria-current={current || undefined} disabled={unavailable} title={unavailable ? t.unavailableHint : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg pr-2 text-left hover:bg-accent/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent">
        <span className="relative">
          <TrackCover track={track} className="h-10 w-10 rounded-lg" />
          {current && (
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/40 text-background">
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium', current && 'text-primary')}><EmojiText text={track.title} /></span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground"><EmojiText text={subtitle} /></span>}
        </span>
      </button>
      {actions}
    </li>
  );
};
