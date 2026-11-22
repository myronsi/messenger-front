import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Loader2, Music2, Pause, Play } from 'lucide-react';
import { formatAudioTime } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { Button } from '@/shared/ui/button';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { uploadProfileFile } from '../api/profileExtrasApi';
import { MUSIC_CLIP_SECONDS } from '../model/musicClip';
import { clipStartAt, readWaveform, WAVEFORM_BARS } from '../model/waveform';
import { readSongTags, songTitleFromFile } from '@/shared/lib/songTags';
import type { MusicChoice } from './ProfileMusicEditor';

interface SongClipPickerProps {
  file: File;
  onCancel: () => void;
  onDone: (choice: MusicChoice) => void;
}

const FIELD = 'w-full border-b border-transparent bg-transparent py-0.5 outline-none transition-colors placeholder:text-muted-foreground hover:border-border focus:border-ring';
const FLAT = Array<number>(WAVEFORM_BARS).fill(0.3);

export const SongClipPicker = ({ file, onCancel, onDone }: SongClipPickerProps) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const [url] = useState(() => URL.createObjectURL(file));
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [start, setStart] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const fallbackTitle = songTitleFromFile(file.name);
  const [percent, setPercent] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef<number | null>(null);
  const clip = duration > 0 ? Math.min(MUSIC_CLIP_SECONDS, duration) : MUSIC_CLIP_SECONDS;
  const end = duration > 0 ? Math.min(duration, start + clip) : clip;
  const range = useLatestRef({ start, end });
  const ready = duration > 0 && peaks !== null;
  const uploading = percent !== null;

  useEffect(() => {
    const element = new Audio(url);
    audio.current = element;
    element.preload = 'auto';
    element.onloadedmetadata = () => { if (Number.isFinite(element.duration)) setDuration((value) => value || element.duration); };
    element.ontimeupdate = () => {
      if (element.currentTime >= range.current.end || element.currentTime < range.current.start - 0.5) element.currentTime = range.current.start;
      setPosition(element.currentTime);
    };
    element.onplay = () => setPlaying(true);
    element.onpause = () => setPlaying(false);
    let alive = true;
    let coverUrl: string | null = null;
    void readSongTags(file).then((tags) => {
      if (!alive) return;
      if (tags.title) setTitle((current) => current || tags.title || '');
      if (tags.artist) setArtist((current) => current || tags.artist || '');
      if (tags.cover) {
        coverUrl = URL.createObjectURL(tags.cover);
        setCover(coverUrl);
      }
    });
    void readWaveform(file).then((result) => {
      if (!alive) return;
      setPeaks(result?.peaks ?? FLAT);
      if (result?.duration) setDuration(result.duration);
    });
    return () => {
      alive = false;
      element.pause();
      element.src = '';
      URL.revokeObjectURL(url);
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [file, url, range]);

  useEffect(() => {
    if (!ready || !audio.current) return;
    audio.current.currentTime = range.current.start;
    void audio.current.play().catch(() => setPlaying(false));
  }, [ready, range]);

  const seekToStart = (next: number) => {
    if (!audio.current) return;
    audio.current.currentTime = next;
    setPosition(next);
    void audio.current.play().catch(() => setPlaying(false));
  };

  const ratioAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    return box && box.width > 0 ? (event.clientX - box.left) / box.width : 0;
  };

  const dragTo = (event: PointerEvent<HTMLDivElement>) => {
    if (grab.current === null || duration <= 0) return;
    setStart(Math.round(clipStartAt(ratioAt(event), grab.current, clip / duration) * duration * 10) / 10);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || uploading || duration <= clip) return;
    const pointer = ratioAt(event);
    const windowStart = start / duration;
    const windowSize = clip / duration;
    grab.current = pointer >= windowStart && pointer <= windowStart + windowSize ? pointer - windowStart : windowSize / 2;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(event);
  };

  const onPointerUp = () => {
    if (grab.current === null) return;
    grab.current = null;
    seekToStart(range.current.start);
  };

  const togglePlay = () => {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else seekToStart(position >= start && position < end ? position : start);
  };

  const done = async () => {
    audio.current?.pause();
    setFailed(false);
    setPercent(0);
    try {
      const attachment = await uploadProfileFile({
        file, purpose: 'profile_music', startMs: start * 1000, endMs: end * 1000, onProgress: setPercent,
      });
      onDone({
        attachment,
        title: title.trim() || attachment.tags?.title?.trim() || fallbackTitle,
        artist: artist.trim() || attachment.tags?.artist?.trim() || '',
      });
    } catch {
      setFailed(true);
      setPercent(null);
    }
  };

  const windowLeft = duration > 0 ? (start / duration) * 100 : 0;
  const windowWidth = duration > 0 ? (clip / duration) * 100 : 100;
  const playhead = duration > 0 && position >= start && position <= end ? ((position - start) / clip) * 100 : 0;

  return (
    <ModalSurface label={t.chooseClip} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onDismiss={() => { if (!uploading) onCancel(); }}>
      <div className="w-full max-w-md rounded-t-2xl bg-background shadow-xl sm:rounded-2xl">
        <header className="flex h-14 items-center gap-2 border-b border-border px-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={uploading}>{t.editCancel}</Button>
          <h3 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{t.chooseClip}</h3>
          <Button type="button" onClick={() => void done()} disabled={!ready || uploading}>
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}{t.clipDone}
          </Button>
        </header>
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground">
              {cover ? <img data-testid="song-cover" src={cover} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-6 w-6" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <input aria-label={t.musicTitle} placeholder={fallbackTitle || t.musicTitle} value={title} maxLength={100} disabled={uploading}
                onChange={(event) => setTitle(event.target.value)} className={cn(FIELD, 'text-base font-semibold text-foreground')} />
              <input aria-label={t.musicArtist} placeholder={t.musicArtist} value={artist} maxLength={100} disabled={uploading}
                onChange={(event) => setArtist(event.target.value)} className={cn(FIELD, 'text-sm text-muted-foreground')} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={togglePlay} disabled={!ready || uploading} aria-label={playing ? t.pauseMusic : t.playMusic}
              className="motion-press flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity disabled:opacity-50">
              {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
            </button>
            <p data-testid="clip-range" className="text-sm font-medium tabular-nums text-foreground">
              {formatAudioTime(start)} – {formatAudioTime(end)}
            </p>
          </div>

          <div>
            <div ref={track} data-testid="clip-track" role="slider" aria-label={t.chooseClip} aria-valuemin={0}
              aria-valuemax={Math.max(0, Math.floor(duration - clip))} aria-valuenow={Math.floor(start)} tabIndex={0}
              onKeyDown={(event) => {
                if (!ready || duration <= clip) return;
                const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                const next = Math.min(duration - clip, Math.max(0, start + step));
                setStart(next);
                seekToStart(next);
              }}
              onPointerDown={onPointerDown} onPointerMove={dragTo} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              className={cn('relative h-20 touch-none select-none rounded-xl bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ready && duration > clip ? 'cursor-grab active:cursor-grabbing' : '')}>
              {!ready ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t.readingSong}
                </div>
              ) : (
                <>
                  <div className="absolute inset-x-2 inset-y-3 flex items-center gap-[2px]" aria-hidden="true">
                    {peaks.map((peak, index) => {
                      const at = ((index + 0.5) / peaks.length) * 100;
                      const inside = at >= windowLeft && at <= windowLeft + windowWidth;
                      return <span key={index} className={cn('flex-1 rounded-full', inside ? 'bg-primary' : 'bg-muted-foreground/30')}
                        style={{ height: `${Math.max(10, peak * 100)}%` }} />;
                    })}
                  </div>
                  <div data-testid="clip-window" className="pointer-events-none absolute inset-y-1 rounded-lg border-2 border-primary bg-primary/10"
                    style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }}>
                    {playing && <span className="absolute inset-y-1 w-0.5 rounded-full bg-foreground" style={{ left: `${playhead}%` }} />}
                  </div>
                </>
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatAudioTime(0)}</span>
              <span>{duration > 0 ? formatAudioTime(duration) : ''}</span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">{t.clipHint}</p>
          {uploading && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
          )}
          {failed && <p className="text-center text-sm text-destructive">{t.musicFailed}</p>}
        </div>
      </div>
    </ModalSurface>
  );
};
