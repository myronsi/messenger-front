import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismissFirstMenu } from './useDismissFirstMenu';

const Menu = ({ close }: { close: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useDismissFirstMenu(true, ref, close);
  return (
    <>
      <div ref={ref}>menu</div>
      <button type="button">outside</button>
    </>
  );
};

describe('useDismissFirstMenu', () => {
  it('ignores the release of the long-press that opened it and closes on the next outside tap', () => {
    const close = vi.fn();
    render(<Menu close={close} />);
    const outside = screen.getByRole('button', { name: 'outside' });
    fireEvent.contextMenu(outside);
    fireEvent.pointerUp(outside);
    fireEvent.click(outside);
    expect(close).not.toHaveBeenCalled();
    fireEvent.pointerDown(outside);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the menu open for taps inside it', () => {
    const close = vi.fn();
    render(<Menu close={close} />);
    fireEvent.pointerDown(screen.getByText('menu'));
    fireEvent.click(screen.getByText('menu'));
    expect(close).not.toHaveBeenCalled();
  });
});
