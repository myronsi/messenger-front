import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Pause, Play, Trash2 } from 'lucide-react';
import { formatAudioTime } from '@/entities/message';
import type { ProfileMusic } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { uploadProfileFile, useDeleteMyMusicMutation, useSetMyMusicMutation, type ProfileUpload } from '../api/profileExtrasApi';
import { clipEnd, MUSIC_CLIP_SECONDS } from '../model/musicClip';

const FIELD = 'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring';
const BUTTON = 'motion-press inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50';

type Step =
  | { kind: 'idle' }
  | { kind: 'picked'; file: File; url: string; duration: number; start: number }
  | { kind: 'uploaded'; attachment: ProfileUpload; title: string; artist: string };

const readDuration = (url: string) => new Promise<number>((resolve) => {
  const probe = new Audio();
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
  probe.onerror = () => resolve(0);
  probe.src = url;
});

export const ProfileMusicEditor = ({ music }: { music?: ProfileMusic | null }) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const preview = useRef<HTMLAudioElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [setMusic] = useSetMyMusicMutation();
  const [deleteMusic, { isLoading: removing }] = useDeleteMyMusicMutation();
  const pickedUrl = step.kind === 'picked' ? step.url : null;

  useEffect(() => () => { if (pickedUrl) URL.revokeObjectURL(pickedUrl); }, [pickedUrl]);
  useEffect(() => () => preview.current?.pause(), []);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(false);
    const url = URL.createObjectURL(file);
    setStep({ kind: 'picked', file, url, duration: await readDuration(url), start: 0 });
  };

  const togglePreview = () => {
    if (step.kind !== 'picked') return;
    if (previewing) { preview.current?.pause(); setPreviewing(false); return; }
    const audio = preview.current ?? new Audio();
    preview.current = audio;
    audio.src = step.url;
    audio.currentTime = step.start;
    audio.ontimeupdate = () => { if (audio.currentTime >= clipEnd(step.start, step.duration)) { audio.pause(); setPreviewing(false); } };
    void audio.play().then(() => setPreviewing(true), () => setPreviewing(false));
  };

  const upload = async () => {
    if (step.kind !== 'picked') return;
    preview.current?.pause();
    setPreviewing(false);
    setBusy(true);
    setError(false);
    try {
      const end = step.duration > 0 ? clipEnd(step.start, step.duration) : undefined;
      const attachment = await uploadProfileFile({
        file: step.file, purpose: 'profile_music', startMs: step.start * 1000, endMs: end === undefined ? undefined : end * 1000,
      });
      setStep({ kind: 'uploaded', attachment, title: attachment.tags?.title ?? step.file.name.replace(/\.[^.]+$/, ''), artist: attachment.tags?.artist ?? '' });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (step.kind !== 'uploaded') return;
    setBusy(true);
    setError(false);
    try {
      await setMusic({ attachment_id: step.attachment.id, title: step.title.trim() || null, artist: step.artist.trim() || null }).unwrap();
      setStep({ kind: 'idle' });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="profile-music-editor" className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{t.music}</p>
        <p className="text-xs text-muted-foreground">{t.musicHint}</p>
      </div>
      {music && step.kind === 'idle' && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2.5">
          <Music2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm">{[music.artist, music.title].filter(Boolean).join(' – ') || t.music}</span>
          <button type="button" onClick={() => void deleteMusic()} disabled={removing} aria-label={t.removeMusic}
            className="motion-press flex h-9 w-9 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {step.kind === 'picked' && (
        <div className="space-y-2">
          <p className="truncate text-sm">{step.file.name}</p>
          {step.duration > MUSIC_CLIP_SECONDS && (
            <input type="range" aria-label={t.musicPart} min={0} max={Math.max(0, Math.floor(step.duration - 1))} step={1} value={step.start}
              onChange={(event) => setStep({ ...step, start: Number(event.target.value) })} className="w-full accent-primary" />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={togglePreview} aria-label={previewing ? t.pauseMusic : t.playMusic}
              className="motion-press flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent">
              {previewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <span className="text-sm text-muted-foreground">
              {fillTemplate(t.musicPart, {
                start: formatAudioTime(step.start), end: formatAudioTime(clipEnd(step.start, step.duration || MUSIC_CLIP_SECONDS)),
              })}
            </span>
          </div>
          <button type="button" onClick={() => void upload()} disabled={busy} className={`${BUTTON} bg-primary text-primary-foreground`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t.uploading : t.usePart}
          </button>
        </div>
      )}
      {step.kind === 'uploaded' && (
        <div className="space-y-2">
          <input aria-label={t.musicTitle} placeholder={t.musicTitle} value={step.title} maxLength={100} className={FIELD}
            onChange={(event) => setStep({ ...step, title: event.target.value })} />
          <input aria-label={t.musicArtist} placeholder={t.musicArtist} value={step.artist} maxLength={100} className={FIELD}
            onChange={(event) => setStep({ ...step, artist: event.target.value })} />
          <button type="button" onClick={() => void save()} disabled={busy} className={`${BUTTON} bg-primary text-primary-foreground`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t.saveMusic}
          </button>
        </div>
      )}
      {step.kind === 'idle' && (
        <button type="button" onClick={() => input.current?.click()} className={`${BUTTON} border border-border hover:bg-accent`}>
          <Music2 className="h-4 w-4" />{t.chooseSong}
        </button>
      )}
      <input ref={input} type="file" accept="audio/*" className="hidden" data-testid="profile-music-input"
        onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ''; }} />
      {error && <p className="text-sm text-destructive">{t.musicFailed}</p>}
    </section>
  );
};
