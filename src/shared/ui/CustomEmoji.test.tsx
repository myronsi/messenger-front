import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomEmoji, EmojiText } from './CustomEmoji';

vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));

describe('CustomEmoji', () => {
  afterEach(() => vi.restoreAllMocks());

  it('draws tokens as images between the text', () => {
    const { container } = render(<p><EmojiText text="hi <:party_cat:42> and <a:wave:7>!" /></p>);
    const images = screen.getAllByRole('img');
    expect(images.map((image) => image.getAttribute('alt'))).toEqual([':party_cat:', ':wave:']);
    expect(images[0].getAttribute('src')).toContain('/emoji/items/42/image');
    expect(container.textContent).toBe('hi  and !');
  });

  it('falls back to the shortcode when the image fails', () => {
    render(<CustomEmoji id="9" shortcode="gone" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(':gone:')).toBeInTheDocument();
  });

  it('leaves plain text alone', () => {
    const { container } = render(<p><EmojiText text="no tokens :party:" /></p>);
    expect(container.innerHTML).toBe('<p>no tokens :party:</p>');
  });

  it('shows the first letter of the shortcode until a slow image has loaded, then pops the image in', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { container } = render(<p><CustomEmoji id="42" shortcode="party_cat" /></p>);
    now.mockReturnValue(600);
    expect(screen.getByTestId('emoji-standin')).toHaveAttribute('data-standin', 'P');
    expect(screen.getByRole('img')).toHaveClass('opacity-0');
    expect(container.textContent).toBe('');
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByTestId('emoji-standin')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveClass('media-pop-in');
  });

  it('shows a cached emoji right away without the pop', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    render(<CustomEmoji id="42" shortcode="party_cat" />);
    fireEvent.load(screen.getByRole('img'));
    expect(screen.getByRole('img')).not.toHaveClass('media-pop-in');
    expect(screen.getByRole('img')).not.toHaveClass('opacity-0');
  });

  it('shows the stand-in again when the same slot switches to another emoji', () => {
    const { rerender } = render(<CustomEmoji id="42" shortcode="party_cat" />);
    fireEvent.load(screen.getByRole('img'));
    rerender(<CustomEmoji id="7" shortcode="wave" />);
    expect(screen.getByTestId('emoji-standin')).toHaveAttribute('data-standin', 'W');
  });
});

