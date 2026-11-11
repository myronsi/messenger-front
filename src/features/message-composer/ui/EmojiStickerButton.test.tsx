import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastKeyboardHeight } from '@/shared/lib/composerFocus';
import EmojiStickerButton from './EmojiStickerButton';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: new Proxy({}, { get: (_target, key) => String(key) }), language: 'en' }),
}));
vi.mock('./StickerTab', () => ({ StickerTab: () => null }));

const Harness = () => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [value, setValue] = useState('hi');
  return (
    <>
      <textarea ref={inputRef} aria-label="composer" value={value} onChange={(event) => setValue(event.target.value)} />
      <EmojiStickerButton inputRef={inputRef} value={value} onChange={setValue} dock={dock} />
      <div ref={setDock} data-testid="dock" />
    </>
  );
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('EmojiStickerButton on mobile', () => {
  it('docks the panel under the composer with the last keyboard height and gives its place to the keyboard when typing again', () => {
    vi.stubGlobal('innerWidth', 390);
    const listeners: (() => void)[] = [];
    const viewport = {
      width: 390, height: 800, scale: 1,
      addEventListener: (_name: string, listener: () => void) => listeners.push(listener), removeEventListener: vi.fn(),
    };
    vi.stubGlobal('visualViewport', viewport);
    lastKeyboardHeight();
    viewport.height = 480;
    render(<Harness />);
    const field = screen.getByLabelText('composer');
    field.focus();
    fireEvent.click(screen.getByTestId('emoji-sticker-button'));
    const panel = screen.getByTestId('emoji-sticker-dock');
    expect(screen.getByTestId('dock')).toContainElement(panel);
    expect(panel).toHaveStyle({ height: '312px' });
    expect(field).not.toHaveFocus();
    expect(screen.getByTestId('emoji-sticker-keyboard-slot').style.height).toBe('max(0px, calc(320px - var(--keyboard-inset, 0px)))');
    viewport.height = 800;
    act(() => field.focus());
    expect(screen.getByTestId('emoji-sticker-keyboard-slot')).toHaveAttribute('aria-hidden', 'true');
    viewport.height = 480;
    act(() => listeners.forEach((listener) => listener()));
    expect(screen.queryByTestId('emoji-sticker-dock')).toBeNull();
  });

  it('inserts emoji without reopening the keyboard and toggles back to the keyboard', () => {
    vi.useFakeTimers();
    vi.stubGlobal('innerWidth', 390);
    render(<Harness />);
    const field = screen.getByLabelText('composer') as HTMLTextAreaElement;
    fireEvent.click(screen.getByTestId('emoji-sticker-button'));
    fireEvent.click(screen.getAllByRole('button').find((button) => button.getAttribute('aria-label') === '😀')!);
    expect(field.value).toContain('😀');
    expect(field).not.toHaveFocus();
    fireEvent.click(screen.getByTestId('emoji-sticker-button'));
    expect(field).toHaveFocus();
    expect(screen.getByTestId('emoji-sticker-keyboard-slot')).toHaveAttribute('aria-hidden', 'true');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('emoji-sticker-keyboard-slot').style.height).toBe('0px');
    act(() => { vi.advanceTimersByTime(220); });
    expect(screen.queryByTestId('emoji-sticker-dock')).toBeNull();
  });
});
