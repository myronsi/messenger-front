import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, THEME_STORAGE_KEY, appearanceVariables, applyAppearance, applyInitialAppearance, loadAppearance,
  parseAppearance, saveAppearance,
} from './settings';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.className = '';
  vi.unstubAllGlobals();
});

describe('parseAppearance', () => {
  it('returns defaults for empty or broken input', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('{not json')).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('"text"')).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid values and drops unknown ones', () => {
    const parsed = parseAppearance(JSON.stringify({ accent: 'teal', fontSize: 30, density: 'compact', corners: 'oval', chatBackground: 'dots', extra: 1 }));
    expect(parsed).toEqual({ ...DEFAULT_APPEARANCE, accent: 'teal', density: 'compact', chatBackground: 'dots' });
  });

  it('rejects fractional font sizes', () => {
    expect(parseAppearance(JSON.stringify({ fontSize: 15.5 })).fontSize).toBe(16);
  });
});

describe('appearance storage', () => {
  it('round-trips the settings through localStorage', () => {
    const settings = { ...DEFAULT_APPEARANCE, accent: 'pink' as const, fontSize: 18 };
    saveAppearance(settings);
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '{}')).toEqual(settings);
    expect(loadAppearance()).toEqual(settings);
  });
});

describe('applyAppearance', () => {
  it('maps settings to CSS variables', () => {
    const variables = appearanceVariables({ ...DEFAULT_APPEARANCE, fontSize: 18, corners: 'round', density: 'compact' }, 'light');
    expect(variables['--chat-font-size']).toBe('1.125rem');
    expect(variables['--bubble-radius']).toBe('1.375rem');
    expect(variables['--chat-gap']).toBe('0.375rem');
    expect(variables['--primary']).toBe('221.2 83.2% 53.3%');
  });

  it('writes variables, data attributes and the theme colour', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    applyAppearance({ ...DEFAULT_APPEARANCE, chatBackground: 'grid' }, 'dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bubble-out')).toBe('217 60% 40%');
    expect(root.dataset.chatBg).toBe('grid');
    expect(meta.content).toMatch(/^#[0-9a-f]{6}$/);
    expect(meta.content).not.toBe('#ffffff');
    meta.remove();
  });

  it('applies the saved dark theme before React renders', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    applyInitialAppearance();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('follows the system preference when the theme is system', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('dark') }));
    applyInitialAppearance();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
