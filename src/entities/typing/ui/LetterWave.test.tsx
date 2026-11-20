import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LetterWave } from './LetterWave';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: ({ alt }: { alt?: string }) => <img alt={alt} data-testid="emoji-img" /> }));

describe('LetterWave', () => {
  it('keeps an emoji made of several code points in one piece', () => {
    render(<LetterWave text="👩‍💻 is typing…" mode="wave" />);
    const units = [...screen.getByTestId('typing-label').querySelectorAll('.letter-wave-unit')].map(unit => unit.textContent);
    expect(units[0]).toBe('👩‍💻');
    expect(units.join('')).toBe('👩‍💻 is typing…');
  });

  it('waves a custom emoji in a name as one unit', () => {
    render(<LetterWave text="<:cat:123> is typing…" mode="ripple" />);
    const units = screen.getByTestId('typing-label').querySelectorAll('.letter-wave-unit');
    expect(units[0].querySelector('[data-testid="emoji-img"]')).toBeInTheDocument();
    expect(screen.getByTestId('typing-label')).toHaveClass('letter-wave-ripple');
  });

  it('spreads the delays so a long label still ripples within about one second', () => {
    const text = 'Somebody with a very long display name is typing…';
    render(<LetterWave text={text} mode="wave" />);
    const units = screen.getByTestId('typing-label').querySelectorAll<HTMLElement>('.letter-wave-unit');
    expect(parseFloat(units[units.length - 1].style.animationDelay)).toBeLessThanOrEqual(1.2);
  });
});
