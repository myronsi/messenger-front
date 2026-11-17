import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarqueeText } from './MarqueeText';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const sizes = (scrollWidth: number, clientWidth: number) => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
};

describe('MarqueeText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('slides a title that does not fit, as far as it overflows', () => {
    sizes(300, 180);
    render(<MarqueeText text="Written in Cold Blood (Mark Saint remix)" />);
    const marquee = screen.getByTestId('marquee');
    expect(marquee).toHaveAttribute('data-sliding', 'true');
    expect((marquee.firstElementChild as HTMLElement).style.getPropertyValue('--marquee-distance')).toBe('-120px');
  });

  it('keeps a short title still', () => {
    sizes(100, 180);
    render(<MarqueeText text="Short" />);
    expect(screen.getByTestId('marquee')).not.toHaveAttribute('data-sliding');
  });

  it('does not move when the user prefers less motion', () => {
    sizes(300, 180);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<MarqueeText text="Written in Cold Blood (Mark Saint remix)" />);
    expect(screen.getByTestId('marquee')).not.toHaveAttribute('data-sliding');
    vi.unstubAllGlobals();
  });
});
