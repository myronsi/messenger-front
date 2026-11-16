import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactionPicker } from './ReactionPicker';

const remember = vi.fn();

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));
vi.mock('@/entities/emoji', () => ({
  rememberEmoji: (value: string) => remember(value),
  useRecentEmoji: () => ['<:blue_dot:1>', '😀'],
  useEmojiPacks: () => [{
    id: '9', title: 'Dots', version: 0, is_mine: true, is_installed: true, is_hidden: false, can_edit: true,
    emoji: [
      { id: '1', pack_id: '9', shortcode: 'blue_dot', is_animated: false, url: '' },
      { id: '2', pack_id: '9', shortcode: 'red_dot', is_animated: false, url: '' },
    ],
  }],
}));

describe('ReactionPicker', () => {
  it('reacts with a custom emoji as c:<id> and remembers its token', () => {
    const onPick = vi.fn();
    render(<ReactionPicker onPick={onPick} />);
    fireEvent.click(screen.getAllByRole('button', { name: ':red_dot:' })[0]);
    expect(onPick).toHaveBeenCalledWith('c:2');
    expect(remember).toHaveBeenCalledWith('<:red_dot:2>');
  });

  it('reacts with recent and normal emoji', () => {
    const onPick = vi.fn();
    render(<ReactionPicker onPick={onPick} />);
    fireEvent.click(screen.getAllByRole('button', { name: ':blue_dot:' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '😀' })[0]);
    expect(onPick.mock.calls).toEqual([['c:1'], ['😀']]);
  });

  it('searches custom emoji by shortcode', () => {
    render(<ReactionPicker onPick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search custom emoji'), { target: { value: ':red' } });
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([':red_dot:']);
  });
});
