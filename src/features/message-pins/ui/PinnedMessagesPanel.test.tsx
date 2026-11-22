import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, PinnedMessage } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { PinnedMessagesPanel, SHEET_CLOSE_DRAG_PX } from './PinnedMessagesPanel';

const requestPinChange = vi.hoisted(() => vi.fn());
vi.mock('@/entities/message', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/entities/message')>()), requestPinChange }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ EmojiText: ({ text }: { text: string }) => <>{text}</> }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { src?: string }) => <img alt="" src={props.src} /> }));

const pin = (id: string, content: Message['content'], scope: PinnedMessage['scope'] = 'everyone'): PinnedMessage => ({
  message: { id, sender: 'Anna', content, timestamp: '', type: typeof content === 'string' ? 'message' : 'file', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: true,
});
const pins = [pin('20', 'Meeting at 5'), pin('10', { file_url: '/a.jpg', thumbnail_url: '/a-small.jpg', file_name: 'a.jpg', file_type: 'image/jpeg', file_size: 1 }, 'me')];

const show = (props: Partial<Parameters<typeof PinnedMessagesPanel>[0]> = {}, wrap = (ui: ReactElement) => ui) => {
  const onClose = vi.fn();
  const onJump = vi.fn();
  render(wrap(<PinnedMessagesPanel chatId="5" pins={pins} count={2} hasMore={false} isLoadingMore={false} isError={false} belowBar
    onLoadMore={vi.fn()} onRetry={vi.fn()} onJump={onJump} onClose={onClose} {...props} />));
  return { onClose, onJump };
};
const phone = (ui: ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;
const touch = (y: number, x = 100) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

beforeEach(() => requestPinChange.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe('PinnedMessagesPanel on desktop', () => {
  beforeEach(() => vi.stubGlobal('innerWidth', 1024));

  it('drops down under the pinned bar with every pin, its picture and who only sees it', () => {
    show();
    expect(screen.getByTestId('pinned-dropdown')).toHaveClass('top-[3.75rem]');
    expect(screen.getByRole('heading', { name: '2 pinned messages' })).toBeInTheDocument();
    expect(screen.getAllByTestId('pinned-panel-item')).toHaveLength(2);
    expect(screen.getByRole('img', { name: en.messagePins.onlyForYou })).toBeInTheDocument();
    expect(document.querySelector('img[src="/a-small.jpg"]')).not.toBeNull();
  });

  it('jumps to a pin and unpins from its button', () => {
    const { onJump } = show();
    fireEvent.click(screen.getAllByTitle(en.messagePins.goToMessage)[0]);
    expect(onJump).toHaveBeenCalledWith('20');
    fireEvent.click(screen.getAllByRole('button', { name: en.messagePins.unpin })[1]);
    expect(requestPinChange).toHaveBeenCalledWith({ chatId: '5', message: pins[1].message, pin: pins[1] });
  });

  it('closes with Escape and with a click outside, but not with a click inside', () => {
    const { onClose } = show();
    fireEvent.mouseDown(screen.getByTestId('pinned-panel'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('sits at the top when the pinned bar is hidden', () => {
    show({ belowBar: false });
    expect(screen.getByTestId('pinned-dropdown')).toHaveClass('top-2');
  });
});

describe('PinnedMessagesPanel on a phone', () => {
  beforeEach(() => vi.stubGlobal('innerWidth', 390));

  it('opens as a bottom sheet that closes when dragged down far enough', () => {
    const { onClose } = show({}, phone);
    expect(screen.getByText(en.messagePins.swipeToUnpin)).toBeInTheDocument();
    const handle = screen.getByTestId('pinned-sheet-handle');
    fireEvent.touchStart(handle, touch(100));
    fireEvent.touchMove(handle, touch(140));
    fireEvent.touchEnd(handle, touch(140));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.touchStart(handle, touch(100));
    fireEvent.touchMove(handle, touch(100 + SHEET_CLOSE_DRAG_PX + 20));
    fireEvent.touchEnd(handle, touch(100 + SHEET_CLOSE_DRAG_PX + 20));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unpins a pin swiped to the left', () => {
    show({}, phone);
    const row = screen.getAllByTestId('pinned-panel-item')[0].firstElementChild as HTMLElement;
    fireEvent.touchStart(row, touch(50, 300));
    fireEvent.touchMove(row, touch(50, 260));
    fireEvent.touchMove(row, touch(50, 120));
    fireEvent.touchEnd(row, touch(50, 120));
    expect(requestPinChange).toHaveBeenCalledWith({ chatId: '5', message: pins[0].message, pin: pins[0] });
  });
});
