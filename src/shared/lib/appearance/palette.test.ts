import { describe, expect, it } from 'vitest';
import { ACCENTS, ACCENT_IDS, SURFACE, contrastRatio, toHex, type ThemeTone } from './palette';

const TONES: ThemeTone[] = ['light', 'dark'];
const AA_TEXT = 4.5;

describe('accent palette', () => {
  it.each(ACCENT_IDS.flatMap((id) => TONES.map((tone) => [id, tone] as const)))('%s in %s mode passes WCAG AA', (id, tone) => {
    const palette = ACCENTS[id][tone];
    const surface = SURFACE[tone];
    expect(contrastRatio(palette.primary, palette.primaryForeground)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(palette.primary, surface.background)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(palette.bubbleOut, palette.bubbleOutForeground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(TONES)('keeps incoming bubbles readable in %s mode', (tone) => {
    expect(contrastRatio(SURFACE[tone].bubbleIn, SURFACE[tone].bubbleInForeground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('converts colours to hex for the theme-color meta tag', () => {
    expect(toHex([0, 0, 100])).toBe('#ffffff');
    expect(toHex([0, 100, 50])).toBe('#ff0000');
  });

  it('computes the known black and white contrast', () => {
    expect(contrastRatio([0, 0, 0], [0, 0, 100])).toBeCloseTo(21, 0);
  });
});
