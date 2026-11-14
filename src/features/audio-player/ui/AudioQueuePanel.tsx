import { GripVertical, Mic, Music, Pause, Play } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { moveAudioTrack, playAudioAt, useAudioPlayer } from '@/entities/message';
import { useQueueDrag } from '../model/useQueueDrag';

const ROW_HEIGHT = 44;

export const AudioQueuePanel = () => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const list = useAudioPlayer((player) => player.list);
  const index = useAudioPlayer((player) => player.index);
  const playing = useAudioPlayer((player) => player.playing || player.loading);
  const drag = useQueueDrag(list.length, ROW_HEIGHT, moveAudioTrack);

  return (
    <div data-testid="audio-queue" className="motion-panel-in absolute inset-x-0 top-full z-40 border-b border-border bg-background shadow-lg">
      <div className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.queue}</div>
      <ol className="max-h-72 overflow-y-auto overscroll-contain pb-1">
        {list.map((track, position) => {
          const current = position === index;
          const KindIcon = track.kind === 'voice' ? Mic : Music;
          const offset = drag.offsetOf(position);
          const dragging = drag.draggingIndex === position;
          return (
            <li key={track.id} data-testid="audio-queue-item" data-state={current ? 'current' : position < index ? 'played' : 'next'}
              className={`relative flex items-center bg-background ${dragging ? 'z-10 shadow-md' : ''}`}
              style={{ height: ROW_HEIGHT, transform: offset ? `translateY(${offset}px)` : undefined, transition: dragging ? 'none' : 'transform 150ms ease-out' }}>
              <button type="button" onClick={() => playAudioAt(position)} aria-current={current || undefined}
                aria-label={current ? t.nowPlaying : track.title}
                className={`flex h-full min-w-0 flex-1 items-center gap-3 px-4 text-left text-sm hover:bg-accent ${
                  current ? 'font-semibold text-primary' : position < index ? 'text-muted-foreground' : ''
                }`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {current ? (playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />)
                    : <KindIcon className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{track.title}</span>
              </button>
              <span role="button" tabIndex={-1} aria-label={t.reorder} {...drag.handle(position)}
                className="flex h-full w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
