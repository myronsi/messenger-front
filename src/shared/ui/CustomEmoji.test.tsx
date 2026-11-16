import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomEmoji, EmojiText } from './CustomEmoji';

vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));

describe('CustomEmoji', () => {
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
});
