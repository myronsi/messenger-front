import React from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clampProgress = (progress: number) => Math.max(0, Math.min(100, Math.round(progress)));

const useProgressLabel = (progress: number) => {
  const { translations } = useLanguage();
  return fillTemplate(translations.uploadProgress || '{percent}%', { percent: String(progress) });
};

export const UploadProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
  const value = clampProgress(progress);
  const label = useProgressLabel(value);
  return (
    <div data-testid="upload-progress-ring" className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-black/35">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
        className="relative grid size-12 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md">
        <svg viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={3} />
          <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-200" />
        </svg>
        <span className="text-[11px] font-semibold tabular-nums">{value}%</span>
      </div>
    </div>
  );
};

export const UploadProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const value = clampProgress(progress);
  const label = useProgressLabel(value);
  return (
    <div data-testid="upload-progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
      className="relative mt-1 h-1 w-full overflow-hidden rounded-full">
      <div className="absolute inset-0 bg-current opacity-20" />
      <div className="relative h-full rounded-full bg-current transition-[width] duration-200" style={{ width: `${value}%` }} />
    </div>
  );
};
