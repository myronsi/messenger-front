import { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { ProfileBackground } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { PRESET_NAMES, presetGradient } from '@/shared/ui/profile/backgroundPresets';
import { ProfileBackgroundFill } from '@/shared/ui/profile/ProfileBackgroundFill';
import { uploadProfileFile, type SetBackgroundBody } from '../api/profileExtrasApi';

interface Props {
  title?: string;
  background?: ProfileBackground | null;
  onSave: (body: SetBackgroundBody | null) => Promise<unknown>;
}

const BUTTON = 'motion-press inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50';

export const ProfileBackgroundEditor = ({ title, background, onSave }: Props) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [colors, setColors] = useState<string[]>(background?.kind === 'color' && background.colors?.length ? background.colors : ['#3366ff']);
  const input = useRef<HTMLInputElement>(null);

  const run = async (body: SetBackgroundBody | null) => {
    setBusy(true);
    setError(false);
    try {
      await onSave(body);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const attachment = await uploadProfileFile({ file, purpose: 'profile_background' });
      await onSave({ kind: 'media', attachment_id: attachment.id });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const activePreset = background?.kind === 'preset' ? background.preset : null;
  return (
    <section data-testid="profile-background-editor" className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title ?? t.background}</p>
        <p className="text-xs text-muted-foreground">{t.backgroundHint}</p>
      </div>
      {background && (
        <div className="relative h-20 overflow-hidden rounded-xl bg-muted">
          <ProfileBackgroundFill background={background} className="absolute inset-0 h-full w-full" />
          <button type="button" onClick={() => void run(null)} disabled={busy} aria-label={t.removeBackground}
            className="motion-press absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-destructive backdrop-blur transition-colors hover:bg-background">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.gradients}</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_NAMES.map((name) => (
            <button key={name} type="button" aria-label={name} aria-pressed={activePreset === name} disabled={busy}
              onClick={() => void run({ kind: 'preset', preset: name })} style={{ backgroundImage: presetGradient(name) }}
              className={cn('motion-press relative h-12 rounded-xl ring-offset-2 ring-offset-background transition', activePreset === name && 'ring-2 ring-primary')}>
              {activePreset === name && <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.colors}</p>
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((color, index) => (
            <input key={index} type="color" value={color} aria-label={`${t.colors} ${index + 1}`}
              onChange={(event) => setColors(colors.map((value, at) => (at === index ? event.target.value : value)))}
              className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1" />
          ))}
          <button type="button" onClick={() => setColors(colors.length > 1 ? colors.slice(0, 1) : [...colors, '#ff6a88'])}
            className={`${BUTTON} border border-border hover:bg-accent`}>
            {colors.length > 1 ? t.oneColor : t.twoColors}
          </button>
          <button type="button" disabled={busy} onClick={() => void run({ kind: 'color', colors: colors.map((value) => value.toLowerCase()) })}
            className={`${BUTTON} bg-primary text-primary-foreground`}>
            {t.saveBackground}
          </button>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`${BUTTON} border border-border hover:bg-accent`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{busy ? t.uploading : t.uploadBackground}
      </button>
      <input ref={input} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" data-testid="profile-background-input"
        onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
      {error && <p className="text-sm text-destructive">{t.backgroundFailed}</p>}
    </section>
  );
};
