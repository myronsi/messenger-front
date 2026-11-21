import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { requestPinChange, type Message, type PinnedMessage } from '@/entities/message';
import { MessagePins } from './MessagePins';
import { openPinnedPanel } from '../model/pinnedPanel';

const pin = vi.fn();
const unpin = vi.fn();
const state = { pins: [] as PinnedMessage[] };

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ EmojiText: ({ text }: { text: string }) => <>{text}</> }));
vi.mock('../model/usePinActions', () => ({ usePinActions: () => ({ pin, unpin }) }));
vi.mock('../model/usePinnedMessages', () => ({
  usePinnedMessages: () => ({
    pins: state.pins, count: state.pins.length, hasMore: false, isLoadingMore: false, isError: false, retry: vi.fn(), loadMore: vi.fn(), pinOf: vi.fn(),
  }),
}));

const message: Message = { id: '10', sender: 'Anna', content: 'Meeting at 5', timestamp: '2026-11-21T10:00:00Z', type: 'message', read_by: [] };
const shared: PinnedMessage = { message, scope: 'everyone', pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: false };
const own: PinnedMessage = { ...shared, scope: 'me' };
const ask = (request: Parameters<typeof requestPinChange>[0]) => act(() => requestPinChange(request));

beforeEach(() => {
  pin.mockClear();
  unpin.mockClear();
  state.pins = [];
});

describe('MessagePins requests', () => {
  it('pins directly for a group member', () => {
    render(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={vi.fn()} />);
    ask({ chatId: '5', message, pin: null });
    expect(pin).toHaveBeenCalledWith('10', 'me');
    expect(screen.queryByTestId('pin-choice-dialog')).not.toBeInTheDocument();
  });

  it('asks in a one-on-one chat and pins for both', () => {
    render(<MessagePins chatId="5" context={{ kind: 'direct', peerName: 'Anna', personalOnly: false }} onJump={vi.fn()} />);
    ask({ chatId: '5', message, pin: null });
    fireEvent.click(screen.getByRole('button', { name: 'Pin for me and Anna' }));
    expect(pin).toHaveBeenCalledWith('10', 'everyone');
  });

  it('pins only for me in Saved Messages without asking', () => {
    render(<MessagePins chatId="5" context={{ kind: 'direct', peerName: 'Me', personalOnly: true }} onJump={vi.fn()} />);
    ask({ chatId: '5', message, pin: null });
    expect(pin).toHaveBeenCalledWith('10', 'me');
  });

  it('unpins my own pin directly and asks for a shared one', () => {
    render(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={vi.fn()} />);
    ask({ chatId: '5', message, pin: own });
    expect(unpin).toHaveBeenCalledWith('10', 'me');
    unpin.mockClear();
    ask({ chatId: '5', message, pin: shared });
    expect(unpin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin for me' }));
    expect(unpin).toHaveBeenCalledWith('10', 'me');
  });

  it('ignores requests for another chat', () => {
    render(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={vi.fn()} />);
    ask({ chatId: '6', message, pin: null });
    expect(pin).not.toHaveBeenCalled();
  });
});

describe('MessagePins bar and panel', () => {
  it('shows the bar only with pins and jumps from the panel', () => {
    const onJump = vi.fn();
    const { rerender } = render(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={onJump} />);
    expect(screen.queryByTestId('pinned-bar')).not.toBeInTheDocument();
    state.pins = [shared];
    rerender(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={onJump} />);
    expect(screen.getByTestId('pinned-bar')).toHaveTextContent('Meeting at 5');
    act(() => openPinnedPanel('5'));
    expect(screen.getAllByTestId('pinned-panel-item')).toHaveLength(1);
    fireEvent.click(screen.getAllByTitle('Go to message')[1]);
    expect(onJump).toHaveBeenCalledWith('10');
    expect(screen.queryByTestId('pinned-panel')).not.toBeInTheDocument();
  });

  it('hides the bar while search is open', () => {
    state.pins = [shared];
    render(<MessagePins chatId="5" context={{ kind: 'group', role: 'member' }} onJump={vi.fn()} hideBar />);
    expect(screen.queryByTestId('pinned-bar')).not.toBeInTheDocument();
  });
});
