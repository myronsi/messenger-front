import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StickerImage } from './StickerImage';

vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));

describe('StickerImage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the sticker emoji as a faded stand-in until a slow image has loaded, then pops it in', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    render(<StickerImage url="/api/v2/stickers/1/image" emoji="🐱" className="h-40 w-40" />);
    expect(screen.getByTestId('sticker-standin')).toHaveAttribute('data-standin', '🐱');
    expect(screen.getByRole('img')).toHaveClass('opacity-0');
    expect(screen.getByTestId('sticker-image')).toHaveClass('h-40', 'w-40');
    now.mockReturnValue(600);
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByTestId('sticker-standin')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveClass('media-pop-in');
  });

  it('shows a cached sticker right away without the pop, so reopening a pack does not bounce', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    render(<StickerImage url="/api/v2/stickers/1/image" emoji="🐱" />);
    fireEvent.load(screen.getByRole('img'));
    expect(screen.getByRole('img')).not.toHaveClass('media-pop-in');
    expect(screen.queryByTestId('sticker-standin')).not.toBeInTheDocument();
  });

  it('draws the sticker with slightly rounded corners', () => {
    render(<StickerImage url="/api/v2/stickers/1/image" emoji="🐱" />);
    expect(screen.getByRole('img')).toHaveClass('rounded-[10%]');
  });

  it('does not flash the stand-in when hovering swaps the still frame for the animation', () => {
    render(<StickerImage url="/api/v2/stickers/1/image" stillUrl="/api/v2/stickers/1/panel" emoji="🐱" />);
    fireEvent.load(screen.getByRole('img'));
    fireEvent.pointerEnter(screen.getByRole('img'));
    expect(screen.queryByTestId('sticker-standin')).not.toBeInTheDocument();
  });
});
