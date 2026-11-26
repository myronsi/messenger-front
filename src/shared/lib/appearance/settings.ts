import { ACCENTS, ACCENT_IDS, SURFACE, toCss, toHex, type AccentId, type ThemeTone } from './palette';
import { DEFAULT_WALLPAPER, loadWallpaperCache, parseWallpaper, type ChatWallpaper } from './wallpaper';

export { CHAT_BACKGROUNDS, type ChatBackground } from './wallpaper';

export const THEME_STORAGE_KEY = 'messenger:theme';
export const APPEARANCE_STORAGE_KEY = 'messenger:appearance';
export const APPEARANCE_LOCAL_STORAGE_KEY = 'messenger:appearance-local';

export const THEME_CHOICES = ['light', 'dark', 'system'] as const;
export type ThemeChoice = typeof THEME_CHOICES[number];

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = typeof DENSITIES[number];

export const CORNERS = ['sharp', 'default', 'round'] as const;
export type Corners = typeof CORNERS[number];

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 20;

export interface AppearanceSettings {
  accent: AccentId;
  fontSize: number;
  density: Density;
  corners: Corners;
  wallpaper: ChatWallpaper;
}

export type SyncedAppearance = Omit<AppearanceSettings, 'wallpaper'>;

export const APPEARANCE_KEYS = ['accent', 'fontSize', 'density', 'corners', 'wallpaper'] as const;
export type AppearanceKey = typeof APPEARANCE_KEYS[number];
export type AppearancePatch = Partial<AppearanceSettings>;

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: 'blue',
  fontSize: 16,
  density: 'comfortable',
  corners: 'default',
  wallpaper: DEFAULT_WALLPAPER,
};

export const DEFAULT_SYNCED_APPEARANCE: SyncedAppearance = {
  accent: DEFAULT_APPEARANCE.accent,
  fontSize: DEFAULT_APPEARANCE.fontSize,
  density: DEFAULT_APPEARANCE.density,
  corners: DEFAULT_APPEARANCE.corners,
};

export const syncedPart = (settings: SyncedAppearance): SyncedAppearance => ({
  accent: settings.accent, fontSize: settings.fontSize, density: settings.density, corners: settings.corners,
});

const CORNER_RADIUS: Record<Corners, string> = { sharp: '0.5rem', default: '1rem', round: '1.375rem' };
const DENSITY_GAP: Record<Density, string> = { comfortable: '1rem', compact: '0.375rem' };

const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  (options as readonly unknown[]).includes(value) ? value as T : fallback;

export const parseAppearancePatch = (value: unknown): AppearancePatch => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const patch: AppearancePatch = {};
  if ((ACCENT_IDS as readonly unknown[]).includes(source.accent)) patch.accent = source.accent as AccentId;
  const size = Number(source.fontSize);
  if (source.fontSize !== undefined && Number.isInteger(size) && size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX) patch.fontSize = size;
  if ((DENSITIES as readonly unknown[]).includes(source.density)) patch.density = source.density as Density;
  if ((CORNERS as readonly unknown[]).includes(source.corners)) patch.corners = source.corners as Corners;
  const wallpaper = parseWallpaper(source.wallpaper ?? source.chatBackground);
  if (wallpaper) patch.wallpaper = wallpaper;
  return patch;
};

const parseJson = (raw: string | null): unknown => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const parseAppearance = (raw: string | null): AppearanceSettings => ({ ...DEFAULT_APPEARANCE, ...parseAppearancePatch(parseJson(raw)) });

export const parseLocalAppearance = (raw: string | null): AppearancePatch => parseAppearancePatch(parseJson(raw));

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const loadAppearance = (): SyncedAppearance => syncedPart(parseAppearance(readStorage(APPEARANCE_STORAGE_KEY)));

const writeStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

export const saveAppearance = (settings: SyncedAppearance) => writeStorage(APPEARANCE_STORAGE_KEY, syncedPart(settings));

export const loadLocalAppearance = () => parseLocalAppearance(readStorage(APPEARANCE_LOCAL_STORAGE_KEY));

export const saveLocalAppearance = (patch: AppearancePatch) => {
  if (Object.keys(patch).length) writeStorage(APPEARANCE_LOCAL_STORAGE_KEY, patch);
  else {
    try {
      localStorage.removeItem(APPEARANCE_LOCAL_STORAGE_KEY);
    } catch {
      return;
    }
  }
};

export const effectiveAppearance = (synced: SyncedAppearance, wallpaper: ChatWallpaper | null, local: AppearancePatch): AppearanceSettings => (
  { ...syncedPart(synced), wallpaper: wallpaper ?? DEFAULT_WALLPAPER, ...local }
);

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
  root.dataset.chatBg = settings.wallpaper.kind === 'builtin' ? settings.wallpaper.preset : 'custom';
  root.dataset.density = settings.density;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = toHex(SURFACE[tone].background);
};

export const applyInitialAppearance = () => {
  const tone = resolveTone(loadThemeChoice());
  const root = document.documentElement;
  root.classList.toggle('dark', tone === 'dark');
  root.style.colorScheme = tone;
  applyAppearance(effectiveAppearance(loadAppearance(), loadWallpaperCache().fallback, loadLocalAppearance()), tone, root);
};
