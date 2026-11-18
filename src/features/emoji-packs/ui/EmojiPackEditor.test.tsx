import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmojiPack } from '@/entities/emoji';
import { EmojiPackEditor } from './EmojiPackEditor';

const { add, remove, renameEmoji, mutation } = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  renameEmoji: vi.fn(),
  mutation: (spy: (...args: unknown[]) => unknown) => () => [(...args: unknown[]) => ({ unwrap: () => spy(...args) }), { isLoading: false }],
}));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));
vi.mock('@/entities/emoji', () => ({
  emojiPackLink: (slug: string) => `https://example.test/emoji/${slug}`,
  useAddCustomEmojiMutation: mutation(add),
  useDeleteCustomEmojiMutation: mutation(remove),
  useRenameCustomEmojiMutation: mutation(renameEmoji),
  useRenameEmojiPackMutation: () => [vi.fn()],
  useDeleteEmojiPackMutation: () => [vi.fn(), { isLoading: false }],
  useSetEmojiPackInstalledMutation: () => [vi.fn()],
}));

const pack = (overrides: Partial<EmojiPack> = {}): EmojiPack => ({
  id: '5', title: 'Cats', version: 1, slug: 'abcdefgh1234', is_mine: true, is_installed: true, is_hidden: false, can_edit: true,
  emoji: [{ id: '50', pack_id: '5', shortcode: 'cat', is_animated: false, url: '' }], ...overrides,
});

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  add.mockReset();
  remove.mockReset();
  renameEmoji.mockReset();
});

describe('EmojiPackEditor', () => {
  it('adds an emoji from the plus tile with a shortcode taken from the file name', async () => {
    add.mockResolvedValue({});
    render(<EmojiPackEditor pack={pack()} />);
    expect(screen.getByText('1 of 200 emoji')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add emoji' }));
    const file = new File(['x'], 'Happy Cat.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('emoji-image-input'), { target: { files: [file] } });
    const panel = screen.getByTestId('add-emoji-panel');
    expect(within(panel).getByLabelText<HTMLInputElement>('Shortcode').value).toBe('happy_cat');
    expect(within(panel).getByAltText('New emoji preview')).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(within(panel).getByRole('button', { name: 'Add emoji' }));
    await waitFor(() => expect(add).toHaveBeenCalledWith({ packId: '5', image: file, shortcode: 'happy_cat' }));
    await waitFor(() => expect(screen.queryByTestId('add-emoji-panel')).toBeNull());
  });

  it('shows why an emoji could not be added and keeps the panel open', async () => {
    add.mockRejectedValue({ status: 409, data: { code: 'shortcode_taken' } });
    render(<EmojiPackEditor pack={pack()} />);
    fireEvent.change(screen.getByTestId('emoji-image-input'), { target: { files: [new File(['x'], 'cat.png', { type: 'image/png' })] } });
    fireEvent.click(within(screen.getByTestId('add-emoji-panel')).getByRole('button', { name: 'Add emoji' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This shortcode is already in the pack');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('add-emoji-panel')).toBeNull();
  });

  it('renames and deletes an emoji after tapping it', async () => {
    renameEmoji.mockResolvedValue({});
    remove.mockResolvedValue(undefined);
    render(<EmojiPackEditor pack={pack()} />);
    fireEvent.click(screen.getByRole('button', { name: ':cat:' }));
    const actions = screen.getByTestId('emoji-tile-actions');
    fireEvent.change(within(actions).getByLabelText('Shortcode'), { target: { value: 'Kitty Cat' } });
    fireEvent.click(within(actions).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(renameEmoji).toHaveBeenCalledWith({ packId: '5', emojiId: '50', shortcode: 'kitty_cat' }));
    await waitFor(() => expect(screen.queryByTestId('emoji-tile-actions')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: ':cat:' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete emoji :cat:' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ packId: '5', emojiId: '50' }));
  });

  it('shows group emoji read-only to members', () => {
    render(<EmojiPackEditor pack={pack({ chat_id: '7', slug: undefined, is_mine: false, can_edit: false })} />);
    expect(screen.getByText('Group emoji')).toBeInTheDocument();
    expect(screen.getByText('1 emoji')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add emoji' })).toBeNull();
    expect(screen.queryByRole('button', { name: ':cat:' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });
});
