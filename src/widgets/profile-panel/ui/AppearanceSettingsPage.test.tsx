import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/shared/contexts/LanguageProvider';
import { AppearanceProvider } from '@/shared/contexts/AppearanceProvider';
import { APPEARANCE_LOCAL_STORAGE_KEY, APPEARANCE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/lib/appearance/settings';
import { WALLPAPERS_STORAGE_KEY } from '@/shared/lib/appearance/wallpaper';
import { PENDING_KEY, resetClientSettingsForTests } from '@/shared/lib/clientSettings/clientSettingsStore';
import { resetWallpapersForTests } from '@/shared/lib/clientSettings/wallpaperStore';
import AppearanceSettingsPage from './AppearanceSettingsPage';

const setup = () => {
  localStorage.setItem('language', 'en');
  return render(
    <AppearanceProvider>
      <LanguageProvider>
        <AppearanceSettingsPage onBack={() => undefined} />
      </LanguageProvider>
    </AppearanceProvider>,
  );
};

const stored = () => JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '{}');
const local = () => JSON.parse(localStorage.getItem(APPEARANCE_LOCAL_STORAGE_KEY) ?? '{}');

beforeEach(() => {
  resetClientSettingsForTests();
  resetWallpapersForTests();
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.className = '';
});

describe('AppearanceSettingsPage', () => {
  it('switches to the dark theme', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('changes the accent colour and saves it', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Green' }));
    expect(stored().accent).toBe('green');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('142 72% 29%');
  });

  it('changes text size, corners, spacing and background', () => {
    setup();
    fireEvent.change(screen.getByRole('slider', { name: 'Message text size' }), { target: { value: '19' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Round' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Compact' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Dots' }));
    expect(stored()).toMatchObject({ fontSize: 19, corners: 'round', density: 'compact' });
    expect(JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}').appearance).toMatchObject({ fontSize: 19, corners: 'round' });
    expect(JSON.parse(localStorage.getItem(WALLPAPERS_STORAGE_KEY) ?? '{}').fallback).toEqual({ kind: 'builtin', preset: 'dots' });
    expect(screen.getByText('19 px')).toBeInTheDocument();
    expect(within(screen.getByTestId('appearance-preview')).getByTestId('chat-wallpaper')).toHaveClass('chat-bg-dots');
    expect(document.documentElement.dataset.chatBg).toBe('dots');
  });

  it('keeps a setting on this device only', () => {
    setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Only on this device: Accent colour' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Teal' }));
    expect(local()).toEqual({ accent: 'teal' });
    expect(stored().accent).not.toBe('teal');
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Only on this device: Accent colour' }));
    expect(local()).toEqual({});
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
  });

  it('picks a two-colour background with a pattern', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Colour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a second colour for a gradient' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    expect(JSON.parse(localStorage.getItem(WALLPAPERS_STORAGE_KEY) ?? '{}').fallback).toEqual({ kind: 'color', colors: ['#3b82f6', '#a855f7'], pattern: 'grid' });
    expect(document.documentElement.dataset.chatBg).toBe('custom');
  });

  it('resets everything to the defaults', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Pink' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(stored().accent).not.toBe('teal');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });
});
