import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DockedEmojiPanel, expandedPanelHeight, settlePanelHeight } from './DockedEmojiPanel';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { expandEmojiPanel: 'Expand panel', collapseEmojiPanel: 'Collapse panel' }, language: 'en' }),
}));

describe('settlePanelHeight', () => {
  it('snaps to the keyboard height or to the expanded height and closes when pulled down far', () => {
    expect(settlePanelHeight(330, 300, 600)).toBe(300);
    expect(settlePanelHeight(500, 300, 600)).toBe(600);
    expect(settlePanelHeight(240, 300, 600)).toBe(300);
    expect(settlePanelHeight(200, 300, 600)).toBeNull();
  });
});

describe('DockedEmojiPanel', () => {
  const panel = () => screen.getByTestId('emoji-sticker-dock');
  const handle = () => screen.getByTestId('emoji-panel-handle');

  it('expands and collapses when the handle is tapped', () => {
    render(<DockedEmojiPanel baseHeight={300} onClose={vi.fn()}>content</DockedEmojiPanel>);
    expect(panel()).toHaveStyle({ height: '300px' });
    fireEvent.pointerDown(handle(), { clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(handle(), { clientY: 500, pointerId: 1 });
    expect(panel()).toHaveStyle({ height: `${expandedPanelHeight(300)}px` });
    expect(handle()).toHaveAccessibleName('Collapse panel');
    fireEvent.pointerDown(handle(), { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(handle(), { clientY: 200, pointerId: 1 });
    expect(panel()).toHaveStyle({ height: '300px' });
  });

  it('follows a drag up and closes after a long drag down', () => {
    const onClose = vi.fn();
    render(<DockedEmojiPanel baseHeight={300} onClose={onClose}>content</DockedEmojiPanel>);
    fireEvent.pointerDown(handle(), { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 450, pointerId: 1 });
    expect(panel()).toHaveStyle({ height: '350px' });
    fireEvent.pointerUp(handle(), { clientY: 450, pointerId: 1 });
    expect(panel()).toHaveStyle({ height: '300px' });
    fireEvent.pointerDown(handle(), { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 650, pointerId: 1 });
    fireEvent.pointerUp(handle(), { clientY: 650, pointerId: 1 });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('DockedEmojiPanel fast flick', () => {
  it('expands after a quick drag up that ends before the next render', () => {
    render(<DockedEmojiPanel baseHeight={300} onClose={vi.fn()}>content</DockedEmojiPanel>);
    const handle = screen.getByTestId('emoji-panel-handle');
    act(() => {
      fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientY: 300, pointerId: 1 });
    });
    expect(screen.getByTestId('emoji-sticker-dock')).toHaveStyle({ height: `${expandedPanelHeight(300)}px` });
  });
});
