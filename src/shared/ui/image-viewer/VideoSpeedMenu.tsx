import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { SPEEDS } from './videoPlayback';

interface VideoSpeedMenuProps {
  rate: number;
  disabled: boolean;
  onChange: (rate: number) => void;
}

export function VideoSpeedMenu({ rate, disabled, onChange }: VideoSpeedMenuProps) {
  const { translations: t } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
        aria-label={`${t.videoSpeed}: ${rate}×`}
        className={`h-8 min-w-12 rounded-full px-2.5 text-xs font-semibold tabular-nums transition-colors disabled:opacity-40 ${
          rate === 1 ? 'hover:bg-white/15' : 'bg-white/90 text-black hover:bg-white/80'
        }`}>
        {rate}×
      </button>
      {open && (
        <div role="menu" aria-label={t.videoSpeed}
          className="motion-reply-in absolute bottom-full right-0 mb-2 w-40 overflow-hidden rounded-xl bg-black/85 py-1 text-sm shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">{t.videoSpeed}</div>
          {[...SPEEDS].reverse().map((speed) => (
            <button key={speed} type="button" role="menuitemradio" aria-checked={speed === rate}
              onClick={() => { onChange(speed); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/10">
              <Check className={`size-4 shrink-0 ${speed === rate ? 'opacity-100' : 'opacity-0'}`} />
              <span className="tabular-nums">{speed}×</span>
              {speed === 1 && <span className="ml-auto text-xs text-white/50">{t.videoSpeedNormal}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
