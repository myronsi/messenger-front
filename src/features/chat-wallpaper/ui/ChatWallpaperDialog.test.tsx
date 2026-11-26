import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/shared/contexts/LanguageProvider';
import { AppearanceProvider } from '@/shared/contexts/AppearanceProvider';
import { resetWallpapersForTests, startWallpaperSync, type WallpaperTransport } from '@/shared/lib/clientSettings/wallpaperStore';
import { ChatWallpaperDialog, type ChatWallpaperTarget } from './ChatWallpaperDialog';

vi.mock('@/shared/ui/sonner', () => ({ toast: vi.fn() }));

const api = {
  load: vi.fn<WallpaperTransport['load']>(async () => ({ fallback: null, chats: {} })),
  setDefault: vi.fn<WallpaperTransport['setDefault']>(async (wallpaper) => wallpaper),
  clearDefault: vi.fn<WallpaperTransport['clearDefault']>(async () => undefined),
  setChat: vi.fn<WallpaperTransport['setChat']>(async (_chatId, wallpaper) => wallpaper),
  clearChat: vi.fn<WallpaperTransport['clearChat']>(async () => undefined),
};

const setup = (target: ChatWallpaperTarget) => {
  localStorage.setItem('language', 'en');
  const onClose = vi.fn();
  render(
    <AppearanceProvider>
      <LanguageProvider>
        <ChatWallpaperDialog target={target} onClose={onClose} />
      </LanguageProvider>
    </AppearanceProvider>,
  );
  return onClose;
};

beforeEach(async () => {
  localStorage.clear();
  resetWallpapersForTests();
  vi.clearAllMocks();
  await startWallpaperSync('1', api);
});

afterEach(() => resetWallpapersForTests());

describe('ChatWallpaperDialog', () => {
  it('sets a background for both people of a direct chat', async () => {
    const onClose = setup({ chatId: '42', peerName: 'Anna', direct: true });
    fireEvent.click(screen.getByLabelText('Use my default'));
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    fireEvent.click(screen.getByRole('radio', { name: 'For both' }));
    expect(screen.getByText('Anna also gets this background and can change it for themselves at any time.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.setChat).toHaveBeenCalledWith('42', { kind: 'builtin', preset: 'grid' }, true);
  });

  it('hides "For both" in groups and saves for me only', async () => {
    const onClose = setup({ chatId: '7', direct: false });
    fireEvent.click(screen.getByLabelText('Use my default'));
    expect(screen.queryByRole('radio', { name: 'For both' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Tint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.setChat).toHaveBeenCalledWith('7', { kind: 'builtin', preset: 'tint' }, false);
  });

  it('disables "For both" while one of them is blocked', () => {
    setup({ chatId: '42', peerName: 'Anna', direct: true, blocked: true });
    fireEvent.click(screen.getByLabelText('Use my default'));
    expect(screen.getByRole('radio', { name: 'For both' })).toBeDisabled();
    expect(screen.getByText('“For both” is not available while one of you has blocked the other.')).toBeInTheDocument();
  });

  it('goes back to the default background', async () => {
    await api.setChat('42', { kind: 'builtin', preset: 'dots' }, false);
    const onClose = setup({ chatId: '42', peerName: 'Anna', direct: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.clearChat).toHaveBeenCalledWith('42');
  });
});
