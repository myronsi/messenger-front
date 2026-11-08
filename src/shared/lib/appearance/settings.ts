import { ACCENTS, ACCENT_IDS, SURFACE, toCss, toHex, type AccentId, type ThemeTone } from './palette';

export const THEME_STORAGE_KEY = 'messenger:theme';
export const APPEARANCE_STORAGE_KEY = 'messenger:appearance';

export const THEME_CHOICES = ['light', 'dark', 'system'] as const;
export type ThemeChoice = typeof THEME_CHOICES[number];

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = typeof DENSITIES[number];

export const CORNERS = ['sharp', 'default', 'round'] as const;
export type Corners = typeof CORNERS[number];

export const CHAT_BACKGROUNDS = ['plain', 'tint', 'gradient', 'dots', 'grid'] as const;
export type ChatBackground = typeof CHAT_BACKGROUNDS[number];

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 20;

export interface AppearanceSettings {
  accent: AccentId;
  fontSize: number;
  density: Density;
  corners: Corners;
  chatBackground: ChatBackground;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: 'blue',
  fontSize: 16,
  density: 'comfortable',
  corners: 'default',
  chatBackground: 'plain',
};

const CORNER_RADIUS: Record<Corners, string> = { sharp: '0.5rem', default: '1rem', round: '1.375rem' };
const DENSITY_GAP: Record<Density, string> = { comfortable: '1rem', compact: '0.375rem' };

const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  (options as readonly unknown[]).includes(value) ? value as T : fallback;

export const parseAppearance = (raw: string | null): AppearanceSettings => {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') value = parsed as Record<string, unknown>;
  } catch {
    value = {};
  }
  const size = Number(value.fontSize);
  return {
    accent: pick(ACCENT_IDS, value.accent, DEFAULT_APPEARANCE.accent),
    fontSize: Number.isInteger(size) && size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX ? size : DEFAULT_APPEARANCE.fontSize,
    density: pick(DENSITIES, value.density, DEFAULT_APPEARANCE.density),
    corners: pick(CORNERS, value.corners, DEFAULT_APPEARANCE.corners),
    chatBackground: pick(CHAT_BACKGROUNDS, value.chatBackground, DEFAULT_APPEARANCE.chatBackground),
  };
};

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const loadAppearance = () => parseAppearance(readStorage(APPEARANCE_STORAGE_KEY));

export const saveAppearance = (settings: AppearanceSettings) => {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
};

export const loadThemeChoice = (): ThemeChoice => pick(THEME_CHOICES, readStorage(THEME_STORAGE_KEY), 'system');

export const resolveTone = (choice: ThemeChoice): ThemeTone => {
  if (choice !== 'system') return choice;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const appearanceVariables = (settings: AppearanceSettings, tone: ThemeTone): Record<string, string> => {
  const palette = ACCENTS[settings.accent][tone];
  return {
    '--primary': toCss(palette.primary),
    '--primary-foreground': toCss(palette.primaryForeground),
    '--primary-darker': toCss(palette.primaryDarker),
    '--ring': toCss(palette.primary),
    '--bubble-out': toCss(palette.bubbleOut),
    '--bubble-out-foreground': toCss(palette.bubbleOutForeground),
    '--chat-font-size': `${settings.fontSize / 16}rem`,
    '--bubble-radius': CORNER_RADIUS[settings.corners],
    '--chat-gap': DENSITY_GAP[settings.density],
  };
};

export const applyAppearance = (settings: AppearanceSettings, tone: ThemeTone, root = document.documentElement) => {
  Object.entries(appearanceVariables(settings, tone)).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.chatBg = settings.chatBackground;
  root.dataset.density = settings.density;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = toHex(SURFACE[tone].background);
};

export const applyInitialAppearance = () => {
  const tone = resolveTone(loadThemeChoice());
  const root = document.documentElement;
  root.classList.toggle('dark', tone === 'dark');
  root.style.colorScheme = tone;
  applyAppearance(loadAppearance(), tone, root);
};
