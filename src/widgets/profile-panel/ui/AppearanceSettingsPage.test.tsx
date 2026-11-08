import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { AppearanceProvider } from '@/shared/contexts/AppearanceContext';
import { APPEARANCE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/lib/appearance/settings';
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
    expect(stored()).toMatchObject({ fontSize: 19, corners: 'round', density: 'compact', chatBackground: 'dots' });
    expect(screen.getByText('19 px')).toBeInTheDocument();
    expect(screen.getByTestId('appearance-preview')).toHaveClass('chat-bg-dots');
    expect(document.documentElement.dataset.chatBg).toBe('dots');
  });

  it('resets everything to the defaults', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Pink' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(stored().accent).toBe('blue');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });
});
