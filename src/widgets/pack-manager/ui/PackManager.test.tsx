import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeEmojiManager, openEmojiPacks } from '@/entities/emoji';
import { closeStickerManager, openStickerPacks } from '@/entities/sticker';
import { PackManager } from './PackManager';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations, language: 'en' }) };
});
vi.mock('@/entities/emoji', async (original) => ({
  ...await original<typeof import('@/entities/emoji')>(),
  useListEmojiPacksQuery: () => ({ data: [{ id: '5', title: 'Cats', emoji: [] }] }),
}));
vi.mock('@/features/sticker-packs', () => ({
  MyStickerPacks: ({ onOpen }: { onOpen: (id: string) => void }) => <button type="button" onClick={() => onOpen('1')}>sticker list</button>,
  StickerPackEditor: ({ packId, onBack }: { packId: string; onBack: () => void }) => <button type="button" onClick={onBack}>{`sticker editor ${packId}`}</button>,
}));
vi.mock('@/features/emoji-packs', () => ({
  MyEmojiPacks: ({ onOpen }: { onOpen: (id: string) => void }) => <button type="button" onClick={() => onOpen('5')}>emoji list</button>,
  EmojiPackEditor: ({ pack, onBack }: { pack: { title: string }; onBack: () => void }) => <button type="button" onClick={onBack}>{`emoji editor ${pack.title}`}</button>,
}));

afterEach(() => act(() => {
  closeStickerManager();
  closeEmojiManager();
}));

const BackButton = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>system back</button>;
};

describe('PackManager', () => {
  it('opens one window with sticker and emoji tabs and moves between lists and editors', () => {
    render(<PackManager />);
    expect(screen.queryByTestId('pack-manager')).toBeNull();
    act(() => openStickerPacks());
    expect(screen.getByRole('tab', { name: 'Stickers' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByText('sticker list'));
    expect(screen.getByText('sticker editor 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Emoji' }));
    fireEvent.click(screen.getByText('emoji list'));
    expect(screen.getByText('emoji editor Cats')).toBeInTheDocument();
    fireEvent.click(screen.getByText('emoji editor Cats'));
    expect(screen.getByText('emoji list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Stickers' }));
    expect(screen.getByText('sticker editor 1')).toBeInTheDocument();
  });

  it('opens the emoji tab and the requested pack when asked from an emoji entry point', () => {
    render(<PackManager />);
    act(() => openEmojiPacks('5'));
    expect(screen.getByRole('tab', { name: 'Emoji' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('emoji editor Cats')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('pack-manager')).toBeNull();
  });

  it('goes back from an editor to the list, then closes, with the back button on mobile', () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    render(<MemoryRouter><PackManager /><BackButton /></MemoryRouter>);
    act(() => openStickerPacks());
    fireEvent.click(screen.getByText('sticker list'));
    expect(screen.getByText('sticker editor 1')).toBeInTheDocument();
    act(() => screen.getByText('system back').click());
    expect(screen.getByText('sticker list')).toBeInTheDocument();
    act(() => screen.getByText('system back').click());
    expect(screen.queryByTestId('pack-manager')).toBeNull();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  });
});
