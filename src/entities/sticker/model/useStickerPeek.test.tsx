import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS } from '@/shared/lib/useLongPress';
import { useStickerPeek } from './useStickerPeek';

const onTap = vi.fn();

const Grid = () => {
  const { peekRef, peekIndex } = useStickerPeek();
  return (
    <div>
      <div ref={peekRef} data-testid="grid">
        {['🐱', '🐶', '🦊'].map((emoji, index) => (
          <button key={emoji} type="button" data-peek-index={index} onClick={() => onTap(emoji)}>{emoji}</button>
        ))}
      </div>
      <output data-testid="peek">{peekIndex === null ? 'none' : String(peekIndex)}</output>
    </div>
  );
};

const touch = (x: number) => ({ touches: [{ clientX: x, clientY: 10 }] });
const under = (index: number) => { vi.mocked(document.elementFromPoint).mockReturnValue(screen.getAllByRole('button')[index]); };
const press = (index: number, x = index * 50) => { under(index); fireEvent.touchStart(screen.getByTestId('grid'), touch(x)); };
const hold = () => act(() => { vi.advanceTimersByTime(LONG_PRESS_MS); });

const originalElementFromPoint = document.elementFromPoint;

describe('useStickerPeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.elementFromPoint = vi.fn();
    onTap.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.elementFromPoint = originalElementFromPoint;
  });

  it('opens the preview after a long press and follows the finger to other stickers', () => {
    render(<Grid />);
    press(0);
    expect(screen.getByTestId('peek')).toHaveTextContent('none');
    hold();
    expect(screen.getByTestId('peek')).toHaveTextContent('0');
    under(2);
    fireEvent.touchMove(screen.getByTestId('grid'), touch(100));
    expect(screen.getByTestId('peek')).toHaveTextContent('2');
  });

  it('closes on release and does not count the release as a tap', () => {
    render(<Grid />);
    press(1);
    hold();
    fireEvent.touchEnd(screen.getByTestId('grid'));
    expect(screen.getByTestId('peek')).toHaveTextContent('none');
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('leaves a short tap alone', () => {
    render(<Grid />);
    press(1);
    fireEvent.touchEnd(screen.getByTestId('grid'));
    hold();
    expect(screen.getByTestId('peek')).toHaveTextContent('none');
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onTap).toHaveBeenCalledWith('🐶');
  });

  it('lets the grid scroll when the finger moves before the long press', () => {
    render(<Grid />);
    press(0, 0);
    fireEvent.touchMove(screen.getByTestId('grid'), touch(40));
    hold();
    expect(screen.getByTestId('peek')).toHaveTextContent('none');
  });
});
