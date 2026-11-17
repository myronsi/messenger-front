import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { en } from '@/shared/lang/en';
import { readDoubleTapReaction, resetDoubleTapReaction, resetReactionUsage } from '@/entities/message';
import PersonalizationSettingsPage from './PersonalizationSettingsPage';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/features/message-actions', () => ({
  ReactionPicker: ({ onPick }: { onPick: (reaction: string) => void }) => <button type="button" onClick={() => onPick('🦄')}>picker</button>,
}));

const t = en.personalization;
const setup = () => render(<PersonalizationSettingsPage userId="5" onBack={() => undefined} />);

describe('PersonalizationSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDoubleTapReaction();
    resetReactionUsage();
  });

  it('starts on the heart and lets you pick another quick reaction or turn it off', () => {
    setup();
    expect(screen.getByRole('radio', { name: '❤️' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '👍' }));
    expect(readDoubleTapReaction('5')).toBe('👍');
    expect(screen.getByRole('radio', { name: '👍' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: t.off }));
    expect(readDoubleTapReaction('5')).toBe('');
    expect(screen.getByText(t.offHint)).toBeInTheDocument();
    resetDoubleTapReaction();
    expect(readDoubleTapReaction('5')).toBe('');
  });

  it('picks any emoji from the full picker and keeps it as a choice', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: t.more }));
    fireEvent.click(screen.getByText('picker'));
    expect(readDoubleTapReaction('5')).toBe('🦄');
    expect(screen.getByRole('radio', { name: '🦄' })).toHaveAttribute('aria-checked', 'true');
  });

  it('reacts on the preview message when you double-tap it', () => {
    setup();
    const preview = screen.getByTestId('double-tap-preview');
    fireEvent.click(preview);
    expect(screen.queryByTestId('double-tap-preview-chip')).toBeNull();
    fireEvent.click(preview);
    expect(screen.getByTestId('double-tap-preview-chip')).toHaveTextContent('❤️');
  });
});
