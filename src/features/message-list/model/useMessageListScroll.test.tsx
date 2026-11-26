import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flushFrames, message, observedOptions, pendingFrames, setup, stubBrowser, triggerResize,
} from './messageListScrollHarness';
import { MessageListScrollProbe as List } from './MessageListScrollProbe';

describe('useMessageListScroll menus', () => {
  beforeEach(() => stubBrowser({ observeResizes: false }));
  afterEach(() => vi.unstubAllGlobals());

  it('keeps menus open when the list scrolls by itself, like for a typing bubble, and closes them on a user scroll', () => {
    const onScrollStart = vi.fn();
    const view = render(<List messages={[message('1')]} onScrollStart={onScrollStart} />);
    const container = view.getByTestId('container');
    act(() => { container.dispatchEvent(new Event('scroll')); flushFrames(); });
    expect(onScrollStart).not.toHaveBeenCalled();
    act(() => {
      container.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
      container.dispatchEvent(new Event('scroll'));
      flushFrames();
    });
    expect(onScrollStart).toHaveBeenCalledTimes(1);
  });
});

describe('useMessageListScroll', () => {
  beforeEach(() => stubBrowser());
  afterEach(() => vi.unstubAllGlobals());

  it('stays at the bottom when an image grows the list before the resize is observed', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    container.scrollTop = 1000;
    await act(async () => { flushFrames(); });

    grow(1300);
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    act(() => triggerResize());

    expect(container.scrollTop).toBe(800);
  });

  it('follows content that grows while a new message is still scrolling into view', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1')]} />);
    container.scrollTop = 1000;
    await act(async () => { flushFrames(); });

    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    grow(1400);
    act(() => triggerResize());
    await act(async () => { flushFrames(100); });

    expect(container.scrollTop).toBe(900);
  });

  it('keeps the newest message visible when the keyboard makes the list shorter', async () => {
    const { view, container, shrinkView } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    expect(container.scrollTop).toBe(500);

    shrinkView(220);
    act(() => triggerResize());

    expect(container.scrollTop).toBe(780);
  });

  it('notices a taller composer space, which is padding on the message content', () => {
    setup([]);
    expect(observedOptions().some((options) => options?.box === 'border-box')).toBe(true);
  });

  it('stays at the bottom when the browser lowers the scroll position itself', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    expect(container.scrollTop).toBe(500);

    grow(950);
    container.scrollTop = 450;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    grow(1250);
    act(() => triggerResize());

    expect(container.scrollTop).toBe(750);
  });

  it('positions a chat that opens with cached messages and follows its later growth', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} chat="a" />);
    await act(async () => { flushFrames(); });
    container.scrollTop = 0;

    view.rerender(<List messages={[message('7'), message('8')]} chat="b" />);
    expect(container.scrollTop).toBe(500);
    await act(async () => { flushFrames(); });
    grow(1030);
    act(() => triggerResize());

    expect(container.scrollTop).toBe(530);
  });

  it('snaps to the bottom without the glide when live messages replace the cached ones', async () => {
    const { view, container, grow } = setup([]);
    const cached = [message('1'), message('2')].map((item) => ({ ...item, is_cached: true }));
    view.rerender(<List messages={cached} />);
    await act(async () => { flushFrames(); });
    expect(container.scrollTop).toBe(500);

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('3')]} />);

    expect(container.scrollTop).toBe(800);
  });

  it('still glides down to a message that arrives while the live list is open', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('3')]} />);

    expect(container.scrollTop).toBe(500);
    await act(async () => { flushFrames(100); });
    expect(container.scrollTop).toBe(800);
  });

  it('waits for the history before the first scroll when only unsent local messages are shown', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('-5'), message('-4')]} loading />);
    await act(async () => { flushFrames(); });
    expect(container.scrollTop).toBe(0);

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('-5'), message('-4')]} />);

    expect(container.scrollTop).toBe(800);
  });

  it('lets the user scroll up and read history', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    container.scrollTop = 1000;
    await act(async () => { flushFrames(); });

    container.dispatchEvent(new Event('wheel'));
    container.scrollTop = 200;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    grow(1300);
    act(() => triggerResize());

    expect(container.scrollTop).toBe(200);
  });

  it.each(['pointerdown', 'touchstart'])('keeps the bottom anchor after a selection tap (%s) and layout reflow', async (event) => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    container.dispatchEvent(new Event(event));
    grow(1200);
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    act(() => triggerResize());
    expect(container.scrollTop).toBe(700);
  });

  it('releases the bottom anchor when a finger actually scrolls the history', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    container.dispatchEvent(new Event('touchstart'));
    container.dispatchEvent(new Event('touchmove'));
    container.scrollTop = 200;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    grow(1300);
    act(() => triggerResize());
    expect(container.scrollTop).toBe(200);
  });

  it('jumps to the bottom at once when the user sends a message while reading history', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    container.dispatchEvent(new Event('wheel'));
    container.scrollTop = 200;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('3')]} ownId="3" />);
    expect(container.scrollTop).toBe(800);
    expect(pendingFrames()).toBe(0);
  });

  it('stays on a search result it jumped to when new content arrives', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    container.scrollTop = 1000;
    await act(async () => { flushFrames(); });

    view.rerender(<List messages={[message('1'), message('2')]} target="1" />);
    container.scrollTop = 200;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    grow(1300);
    act(() => triggerResize());

    expect(container.scrollTop).toBe(200);
  });
});
