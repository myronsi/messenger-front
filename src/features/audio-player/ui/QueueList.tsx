import { GripVertical, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { clearUpcoming, moveAudioTrack, playAudioAt, removeFromQueue, trackSubtitle, useAudioPlayer } from '@/entities/message';
import { useQueueDrag } from '../model/useQueueDrag';
import { TrackCover } from './TrackCover';

const ROW_HEIGHT = 56;

export const QueueList = () => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const list = useAudioPlayer((player) => player.list);
  const index = useAudioPlayer((player) => player.index);
  const upcoming = list.slice(index + 1);
  const drag = useQueueDrag(upcoming.length, ROW_HEIGHT, (from, to) => moveAudioTrack(index + 1 + from, index + 1 + to));

  if (upcoming.length === 0) return <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t.emptyQueue}</p>;
  return (
    <div>
      <div className="flex justify-end px-3">
        <button type="button" onClick={clearUpcoming} className="rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10">{t.clearQueue}</button>
      </div>
      <ol data-testid="audio-queue">
        {upcoming.map((track, offset) => {
          const position = index + 1 + offset;
          const moved = drag.offsetOf(offset);
          const dragging = drag.draggingIndex === offset;
          const subtitle = trackSubtitle(track, t.fromName);
          return (
            <li key={track.id} data-testid="audio-queue-item" className={`relative flex items-center bg-background ${dragging ? 'z-10 shadow-md' : ''}`}
              style={{ height: ROW_HEIGHT, transform: moved ? `translateY(${moved}px)` : undefined, transition: dragging ? 'none' : 'transform 150ms ease-out' }}>
              <span role="button" tabIndex={-1} aria-label={t.reorder} {...drag.handle(offset)}
                className="flex h-full w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
              </span>
              <button type="button" onClick={() => playAudioAt(position)} className="flex h-full min-w-0 flex-1 items-center gap-3 text-left hover:bg-accent/60">
                <TrackCover track={track} className="h-10 w-10 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium"><EmojiText text={track.title} /></span>
                  {subtitle && <span className="block truncate text-xs text-muted-foreground"><EmojiText text={subtitle} /></span>}
                </span>
              </button>
              <button type="button" onClick={() => removeFromQueue(position)} aria-label={t.removeFromQueue}
                className="motion-press mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
