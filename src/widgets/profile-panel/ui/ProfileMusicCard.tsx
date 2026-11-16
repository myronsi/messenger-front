import { Music2, Pause, Play } from 'lucide-react';
import type { ProfileMusic } from '@/entities/user';
import { formatAudioTime, pauseAudio, playAudio, useAudioPlayer } from '@/entities/message';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ProfileMusicCardProps {
  music: ProfileMusic;
  ownerName: string;
}

export const ProfileMusicCard = ({ music, ownerName }: ProfileMusicCardProps) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const { attachment } = music;
  const playing = useAudioPlayer((state) => state.playing && state.track?.id === attachment.id);
  const title = music.title || t.music;
  const duration = (attachment.duration_ms ?? 0) / 1000;
  const toggle = () => {
    if (playing) pauseAudio();
    else playAudio({ id: attachment.id, src: attachment.url, title: music.artist ? `${music.artist} – ${title}` : `${ownerName} – ${title}`, kind: 'music', duration });
  };
  return (
    <section data-testid="profile-music" className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-2.5 backdrop-blur">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
        {attachment.thumbnail_url
          ? <AuthenticatedImage src={attachment.thumbnail_url} alt="" className="h-full w-full object-cover" />
          : <Music2 className="h-5 w-5" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{[music.artist, duration > 0 ? formatAudioTime(duration) : null].filter(Boolean).join(' · ')}</p>
      </div>
      <button type="button" onClick={toggle} aria-label={playing ? t.pauseMusic : t.playMusic}
        className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90">
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
      </button>
    </section>
  );
};
