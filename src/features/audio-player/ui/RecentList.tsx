import { useLanguage } from '@/shared/contexts/LanguageContext';
import { clearHistory, playAudio, TrackMenu, useAudioLibrary } from '@/entities/message';
import { TrackRow } from './TrackRow';

export const RecentList = () => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const history = useAudioLibrary((library) => library.history);
  if (history.length === 0) return <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t.emptyRecent}</p>;
  return (
    <div>
      <div className="flex justify-end px-3">
        <button type="button" onClick={clearHistory} className="rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10">{t.clearHistory}</button>
      </div>
      <ul data-testid="audio-recent">
        {history.map((track, index) => (
          <TrackRow key={track.id} track={track} onPlay={() => playAudio(track, history.slice(index + 1))} actions={<TrackMenu track={track} />} />
        ))}
      </ul>
    </div>
  );
};
