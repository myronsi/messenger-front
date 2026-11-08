export type Hsl = readonly [number, number, number];
export type ThemeTone = 'light' | 'dark';

export interface AccentTone {
  primary: Hsl;
  primaryForeground: Hsl;
  primaryDarker: Hsl;
  bubbleOut: Hsl;
  bubbleOutForeground: Hsl;
}

const WHITE: Hsl = [0, 0, 100];
const NEAR_WHITE: Hsl = [210, 40, 98];

const accent = (light: Hsl, dark: Hsl, darkBubble: Hsl): Record<ThemeTone, AccentTone> => ({
  light: {
    primary: light,
    primaryForeground: NEAR_WHITE,
    primaryDarker: [light[0], light[1], light[2] - 10],
    bubbleOut: light,
    bubbleOutForeground: NEAR_WHITE,
  },
  dark: {
    primary: dark,
    primaryForeground: [dark[0], 47, 8],
    primaryDarker: [dark[0], dark[1], dark[2] - 8],
    bubbleOut: darkBubble,
    bubbleOutForeground: WHITE,
  },
});

export const ACCENTS = {
  blue: accent([221.2, 83.2, 53.3], [217, 91, 68], [217, 60, 40]),
  violet: accent([262, 72, 54], [258, 90, 77], [262, 45, 42]),
  green: accent([142, 72, 29], [142, 65, 55], [150, 50, 27]),
  orange: accent([17, 88, 40], [27, 95, 62], [20, 65, 35]),
  pink: accent([336, 74, 42], [330, 80, 72], [335, 52, 38]),
  teal: accent([175, 77, 26], [172, 62, 50], [175, 60, 24]),
  graphite: accent([215, 25, 27], [215, 20, 76], [215, 20, 30]),
} as const satisfies Record<string, Record<ThemeTone, AccentTone>>;

export type AccentId = keyof typeof ACCENTS;
export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

export const SURFACE: Record<ThemeTone, { background: Hsl; foreground: Hsl; bubbleIn: Hsl; bubbleInForeground: Hsl }> = {
  light: { background: [0, 0, 100], foreground: [222.2, 84, 4.9], bubbleIn: [210, 40, 96.1], bubbleInForeground: [222.2, 47.4, 11.2] },
  dark: { background: [222, 28, 9], foreground: [210, 40, 96], bubbleIn: [217, 22, 18], bubbleInForeground: [210, 40, 96] },
};

export const toCss = ([h, s, l]: Hsl) => `${h} ${s}% ${l}%`;

export const toRgb = ([h, s, l]: Hsl): [number, number, number] => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((value) => Math.round(value * 255)) as [number, number, number];
};

export const toHex = (color: Hsl) => `#${toRgb(color).map((value) => value.toString(16).padStart(2, '0')).join('')}`;

const luminance = (color: Hsl) => {
  const [r, g, b] = toRgb(color).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (first: Hsl, second: Hsl) => {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};
