import type { CSSProperties } from 'react';
import type { components } from '@/shared/api/generated/schema';

export type ProfileBackgroundValue = components['schemas']['ProfileBackground'];

export const BACKGROUND_PRESETS: Record<string, [string, string, string]> = {
  sunset: ['#ff9a8b', '#ff6a88', '#ff99ac'],
  dawn: ['#f6d365', '#fda085', '#f6a97a'],
  ocean: ['#2193b0', '#3fb5d6', '#6dd5ed'],
  aurora: ['#00c9ff', '#4be3c4', '#92fe9d'],
  forest: ['#134e5e', '#3f8068', '#71b280'],
  lavender: ['#a18cd1', '#c7a6e0', '#fbc2eb'],
  candy: ['#ff6cab', '#b86bd8', '#7366ff'],
  night: ['#232526', '#2f3133', '#414345'],
};

export const PRESET_NAMES = Object.keys(BACKGROUND_PRESETS);

export const presetGradient = (name: string) => {
  const stops = BACKGROUND_PRESETS[name];
  return stops ? `linear-gradient(135deg, ${stops[0]} 0%, ${stops[1]} 50%, ${stops[2]} 100%)` : undefined;
};

export const colorsGradient = (colors: string[]) => (
  colors.length > 1 ? `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)` : undefined
);

export const backgroundStyle = (background: ProfileBackgroundValue): CSSProperties | null => {
  if (background.kind === 'preset' && background.preset) {
    const gradient = presetGradient(background.preset);
    return gradient ? { backgroundImage: gradient } : null;
  }
  if (background.kind === 'color' && background.colors?.length) {
    const gradient = colorsGradient(background.colors);
    return gradient ? { backgroundImage: gradient } : { backgroundColor: background.colors[0] };
  }
  return null;
};

export const hasVisibleBackground = (background?: ProfileBackgroundValue | null): background is ProfileBackgroundValue => (
  !!background && (background.kind === 'media' ? !!background.attachment : backgroundStyle(background) !== null)
);

type NetworkInfo = { connection?: { saveData?: boolean } };

export const prefersStillBackground = () => (
  (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || (typeof navigator !== 'undefined' && !!(navigator as Navigator & NetworkInfo).connection?.saveData)
);
