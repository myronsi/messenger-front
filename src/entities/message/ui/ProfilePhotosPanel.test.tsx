import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePhotosPanel, type ProfilePhotoItem } from './ProfileChatPanels';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {}, language: 'en' }) }));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});
vi.mock('../api/messageApi', () => ({ useSearchChatMessagesQuery: () => ({ data: undefined }) }));

const photos: ProfilePhotoItem[] = ['one', 'two', 'three'].map((name, index) => ({
  id: String(index + 1), url: `/${name}.png`, thumbnailUrl: `/${name}-thumb.png`, name: `${name}.png`, timestamp: '2026-11-02T10:00:00Z',
}));

describe('ProfilePhotosPanel', () => {
  it('opens the clicked photo full screen as part of a gallery', () => {
    render(<ProfilePhotosPanel photos={photos} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('two.png'));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'two.png');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
