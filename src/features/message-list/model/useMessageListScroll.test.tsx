import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useMessageListScroll } from './useMessageListScroll';

const message = (id: string): Message => ({
  id, sender: 'alice', sender_id: '1', content: `m${id}`, timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [],
});

let resize: () => void = () => {};
let observed: [Element, ResizeObserverOptions | undefined][] = [];
let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  for (let i = 0; i < 5 && frames.length; i += 1) {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(0));
  }
};

const List = ({ messages, chat = 'chat', target = null }: { messages: Message[]; chat?: string; target?: string | null }) => {
  const messageRefs = useRef({});
  const { chatContainerRef, contentRef } = useMessageListScroll({
    messages, messageRefs, highlightedMessageId: target, tempHighlightedMessageId: null,
    getFormattedDateLabel: () => '', hasMoreMessages: false, hasMoreNewerMessages: false,
    isLoadingInitialMessages: false, isLoadingOlderMessages: false, isLoadingNewerMessages: false,
    scrollToBottomKey: chat, isOwnMessage: () => false,
  });
  return <div data-testid="container" ref={chatContainerRef}><div ref={contentRef} /></div>;
};

const setup = (messages: Message[]) => {
  let scrollHeight = 1000;
  const view = render(<List messages={messages} />);
  const container = view.getByTestId('container');
  let scrollTop = 0;
  let clientHeight = 500;
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => clientHeight });
  Object.defineProperty(container, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(container, 'scrollTop', {
    configurable: true, get: () => scrollTop, set: (value: number) => { scrollTop = Math.min(value, scrollHeight - clientHeight); },
  });
  container.scrollTo = ((options: ScrollToOptions) => { container.scrollTop = options.top ?? 0; }) as typeof container.scrollTo;
  return {
    view, container,
    grow: (height: number) => { scrollHeight = height; },
    shrinkView: (height: number) => { clientHeight = height; },
  };
};

describe('useMessageListScroll', () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe(element: Element, options?: ResizeObserverOptions) { observed.push([element, options]); }
      disconnect() {}
    });
    observed = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stays at the bottom when an image grows the list before the resize is observed', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    container.scrollTop = 1000;
    await act(async () => { flushFrames(); });

    grow(1300);
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });
    act(() => resize());

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
    act(() => resize());

    expect(container.scrollTop).toBe(900);
  });

  it('keeps the newest message visible when the keyboard makes the list shorter', async () => {
    const { view, container, shrinkView } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });
    expect(container.scrollTop).toBe(500);

    shrinkView(220);
    act(() => resize());

    expect(container.scrollTop).toBe(780);
  });

  it('notices a taller composer space, which is padding on the message content', () => {
    setup([]);
    expect(observed.some(([, options]) => options?.box === 'border-box')).toBe(true);
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
    act(() => resize());

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
    act(() => resize());

    expect(container.scrollTop).toBe(530);
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
    act(() => resize());

    expect(container.scrollTop).toBe(200);
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
    act(() => resize());

    expect(container.scrollTop).toBe(200);
  });
});
