import { describe, expect, it } from 'vitest';
import { backgroundStyle, hasVisibleBackground, PRESET_NAMES } from './backgroundPresets';

describe('profile backgrounds', () => {
  it('turns presets and colors into styles', () => {
    expect(backgroundStyle({ kind: 'preset', preset: 'ocean' })?.backgroundImage).toContain('linear-gradient');
    expect(backgroundStyle({ kind: 'color', colors: ['#112233'] })).toEqual({ backgroundColor: '#112233' });
    expect(backgroundStyle({ kind: 'color', colors: ['#112233', '#445566'] })?.backgroundImage).toBe('linear-gradient(135deg, #112233 0%, #445566 100%)');
  });

  it('falls back for unknown presets and media without a file', () => {
    expect(backgroundStyle({ kind: 'preset', preset: 'from-the-future' })).toBeNull();
    expect(hasVisibleBackground({ kind: 'preset', preset: 'from-the-future' })).toBe(false);
    expect(hasVisibleBackground({ kind: 'media' })).toBe(false);
    expect(hasVisibleBackground(null)).toBe(false);
    expect(hasVisibleBackground({ kind: 'preset', preset: PRESET_NAMES[0] })).toBe(true);
  });
});
