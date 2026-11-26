import { render } from '@testing-library/react';
import { createElement } from 'react';
import { vi } from 'vitest';
import type { Message } from '@/entities/message';
import { MessageListScrollProbe } from './MessageListScrollProbe';

export const message = (id: string): Message => ({
  id, sender: 'alice', sender_id: '1', content: `m${id}`, timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [],
});

let resize: () => void = () => {};
let observed: [Element, ResizeObserverOptions | undefined][] = [];
let frames: FrameRequestCallback[] = [];
let clock = 0;

export const flushFrames = (count = 5) => {
  for (let i = 0; i < count && frames.length; i += 1) {
    const pending = frames;
    frames = [];
    clock += 1000 / 60;
    pending.forEach((callback) => callback(clock));
  }
};

export const pendingFrames = () => frames.length;
export const triggerResize = () => resize();
export const observedOptions = () => observed.map(([, options]) => options);

export const stubBrowser = ({ observeResizes = true } = {}) => {
  frames = [];
  observed = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', observeResizes ? class {
    constructor(callback: () => void) { resize = callback; }
    observe(element: Element, options?: ResizeObserverOptions) { observed.push([element, options]); }
    disconnect() {}
  } : class { observe() {} disconnect() {} });
};

export const setup = (messages: Message[]) => {
  let scrollHeight = 1000;
  const view = render(createElement(MessageListScrollProbe, { messages }));
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
