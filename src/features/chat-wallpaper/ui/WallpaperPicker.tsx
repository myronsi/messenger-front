import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Minus, Plus } from 'lucide-react';
import { uploadWallpaperPhoto, wallpaperFileProblem, WALLPAPER_TYPES } from '@/entities/chat-wallpaper';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import type { ThemeTone } from '@/shared/lib/appearance/palette';
import {
  CHAT_BACKGROUNDS, WALLPAPER_BLUR_MAX, WALLPAPER_DIM_MAX, WALLPAPER_PATTERNS, wallpaperDim, type ChatWallpaper, type WallpaperPattern,
  type WallpaperPhoto,
} from '@/shared/lib/appearance/wallpaper';

type Tab = ChatWallpaper['kind'];
const TABS: readonly Tab[] = ['builtin', 'color', 'photo'];
const DEFAULT_COLORS = ['#3b82f6', '#a855f7'];

interface Segment<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

const Segmented = <T extends string>({ label, value, options, labels, onChange, disabled }: Segment<T>) => (
  <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
    {options.map((option) => (
      <button key={option} type="button" role="radio" aria-checked={option === value} disabled={disabled} onClick={() => onChange(option)}
        className={cn('flex min-h-9 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
          option === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
        <span className="truncate">{labels[option]}</span>
      </button>
    ))}
  </div>
);

interface RangeProps {
  label: string;
  valueText: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Range = ({ label, valueText, value, max, onChange, disabled }: RangeProps) => (
  <label className="block space-y-1">
    <span className="flex items-center justify-between text-sm">
      <span className="text-foreground">{label}</span>
      <span className="tabular-nums text-muted-foreground">{valueText}</span>
    </span>
    <input type="range" min={0} max={max} step={1} value={value} disabled={disabled} aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-primary disabled:cursor-default" />
  </label>
);

interface WallpaperPickerProps {
  value: ChatWallpaper;
  tone: ThemeTone;
  onChange: (value: ChatWallpaper) => void;
  disabled?: boolean;
}

export const WallpaperPicker = ({ value, tone, onChange, disabled }: WallpaperPickerProps) => {
  const { translations } = useLanguage();
  const t = translations.appearance.wallpaper;
  const names = translations.appearance.chatBackgrounds;
  const [tab, setTab] = useState<Tab>(value.kind);
  const [shownKind, setShownKind] = useState<Tab>(value.kind);
  if (shownKind !== value.kind) {
    setShownKind(value.kind);
    setTab(value.kind);
  }
  const [colors, setColors] = useState<string[]>(value.kind === 'color' ? value.colors : DEFAULT_COLORS.slice(0, 1));
  const [pattern, setPattern] = useState<WallpaperPattern>(value.kind === 'color' ? value.pattern : 'none');
  const [photo, setPhoto] = useState<WallpaperPhoto | null>(value.kind === 'photo' ? value.photo : null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const chooseColors = (next: string[], nextPattern = pattern) => {
    setColors(next);
    setPattern(nextPattern);
    onChange({ kind: 'color', colors: next, pattern: nextPattern });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === value.kind) return;
    if (next === 'color') chooseColors(colors);
    if (next === 'photo' && photo) onChange({ kind: 'photo', photo, blur: 0, dim: null });
    if (next === 'builtin') onChange({ kind: 'builtin', preset: 'plain' });
  };

  const upload = async (file?: File) => {
    if (!file) return;
    const issue = wallpaperFileProblem(file);
    if (issue) {
      setProblem(issue === 'size' ? t.tooLarge : t.wrongType);
      return;
    }
    setProblem(null);
    setProgress(0);
    try {
      const uploaded = await uploadWallpaperPhoto(file, setProgress);
      setPhoto(uploaded);
      onChange({ kind: 'photo', photo: uploaded, blur: value.kind === 'photo' ? value.blur : 0, dim: value.kind === 'photo' ? value.dim : null });
    } catch {
      setProblem(t.uploadFailed);
    } finally {
      setProgress(null);
    }
  };

  const busy = disabled || progress !== null;
  const tabLabels: Record<Tab, string> = { builtin: t.builtIn, color: t.color, photo: t.photo };

  return (
    <div className="space-y-3" data-testid="wallpaper-picker">
      <Segmented label={translations.appearance.chatBackground} value={tab} options={TABS} labels={tabLabels} onChange={switchTab} disabled={busy} />
      {tab === 'builtin' && (
        <div role="radiogroup" aria-label={t.builtIn} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CHAT_BACKGROUNDS.map((id) => {
            const active = value.kind === 'builtin' && value.preset === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={active} disabled={busy} onClick={() => onChange({ kind: 'builtin', preset: id })}
                className="group flex flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span aria-hidden="true" className={cn(`chat-bg-${id} block h-14 w-full rounded-lg border-2 transition-colors`,
                  active ? 'border-primary' : 'border-border group-hover:border-input')} />
                <span className={cn('text-xs', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{names[id]}</span>
              </button>
            );
          })}
        </div>
      )}
      {tab === 'color' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {colors.map((color, index) => (
              <label key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="color" value={color} disabled={busy} aria-label={index === 0 ? t.firstColor : t.secondColor}
                  onChange={(event) => chooseColors(colors.map((item, at) => (at === index ? event.target.value.toLowerCase() : item)))}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-0.5" />
              </label>
            ))}
            {colors.length < 2 ? (
              <button type="button" disabled={busy} onClick={() => chooseColors([...colors, DEFAULT_COLORS[1]])}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent">
                <Plus className="h-4 w-4" aria-hidden="true" />{t.addSecondColor}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => chooseColors(colors.slice(0, 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent">
                <Minus className="h-4 w-4" aria-hidden="true" />{t.removeSecondColor}
              </button>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground">{t.pattern}</p>
            <Segmented label={t.pattern} value={pattern} options={WALLPAPER_PATTERNS} labels={t.patterns} disabled={busy}
              onChange={(next) => chooseColors(colors, next)} />
          </div>
        </div>
      )}
      {tab === 'photo' && (
        <div className="space-y-3">
          <input ref={input} type="file" accept={WALLPAPER_TYPES.join(',')} className="hidden" data-testid="wallpaper-file"
            onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-accent disabled:opacity-50">
            {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {progress !== null ? fillTemplate(t.uploading, { percent: String(Math.round(progress)) }) : photo ? t.changePhoto : t.uploadPhoto}
          </button>
          {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
          {value.kind === 'photo' && (
            <div className="space-y-3">
              <Range label={t.blur} value={value.blur} max={WALLPAPER_BLUR_MAX} disabled={busy}
                valueText={fillTemplate(t.blurValue, { value: String(value.blur) })} onChange={(blur) => onChange({ ...value, blur })} />
              <Range label={t.dim} value={wallpaperDim(value, tone)} max={WALLPAPER_DIM_MAX} disabled={busy}
                valueText={value.dim === null ? `${t.dimAuto} · ${fillTemplate(t.dimValue, { value: String(wallpaperDim(value, tone)) })}`
                  : fillTemplate(t.dimValue, { value: String(value.dim) })}
                onChange={(dim) => onChange({ ...value, dim })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
