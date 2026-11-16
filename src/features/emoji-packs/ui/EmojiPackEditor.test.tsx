import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EmojiPack } from '@/entities/emoji';
import { EmojiPackEditor } from './EmojiPackEditor';

const add = vi.fn();
const remove = vi.fn();

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));
vi.mock('@/entities/emoji', () => ({
  emojiPackLink: (slug: string) => `https://example.test/emoji/${slug}`,
  useAddCustomEmojiMutation: () => [(...args: unknown[]) => ({ unwrap: () => add(...args) }), { isLoading: false }],
  useDeleteCustomEmojiMutation: () => [(...args: unknown[]) => remove(...args)],
  useRenameEmojiPackMutation: () => [vi.fn()],
  useDeleteEmojiPackMutation: () => [vi.fn()],
}));

const pack = (overrides: Partial<EmojiPack> = {}): EmojiPack => ({
  id: '5', title: 'Cats', version: 1, slug: 'abcdefgh1234', is_mine: true, is_installed: true, is_hidden: false, can_edit: true,
  emoji: [{ id: '50', pack_id: '5', shortcode: 'cat', is_animated: false, url: '' }], ...overrides,
});

describe('EmojiPackEditor', () => {
  it('adds an emoji with a shortcode taken from the file name', async () => {
    add.mockResolvedValue({});
    render(<EmojiPackEditor pack={pack()} />);
    const file = new File(['x'], 'Happy Cat.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('emoji-image-input'), { target: { files: [file] } });
    expect(screen.getByLabelText<HTMLInputElement>('Shortcode').value).toBe('happy_cat');
    const addButtons = screen.getAllByRole('button', { name: 'Add emoji' });
    fireEvent.click(addButtons[addButtons.length - 1]);
    await waitFor(() => expect(add).toHaveBeenCalledWith({ packId: '5', image: file, shortcode: 'happy_cat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete emoji :cat:' }));
    expect(remove).toHaveBeenCalledWith({ packId: '5', emojiId: '50' });
  });

  it('shows group emoji read-only to members', () => {
    render(<EmojiPackEditor pack={pack({ chat_id: '7', slug: undefined, is_mine: false, can_edit: false })} />);
    expect(screen.getByText('Group emoji')).toBeInTheDocument();
    expect(screen.queryByLabelText('Shortcode')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });
});
