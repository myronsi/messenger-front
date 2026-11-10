import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageTextBody } from './MessageTextBody';

let frames: FrameRequestCallback[] = [];
const flushFrames = () => act(() => {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(0));
});

const Bubble = ({ text, time }: { text: string; time: string }) => (
  <div data-message-column>
    <div className="motion-message-bubble">
      <MessageTextBody text={text} trailing={<span data-message-time-spacer>{time}</span>} />
    </div>
  </div>
);

describe('MessageTextBody width fitting', () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('measures in the next frame, once per text and timestamp, and reuses the result for an equal row', () => {
    const clone = vi.spyOn(Node.prototype, 'cloneNode');
    const view = render(<Bubble text="hello there" time="10:00" />);
    expect(clone).not.toHaveBeenCalled();

    flushFrames();
    expect(clone).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector<HTMLElement>('[data-message-text-body]')?.dataset.timeLayout).toBe('inline');

    view.rerender(<Bubble text="hello there" time="10:00" />);
    flushFrames();
    expect(clone).toHaveBeenCalledTimes(1);

    view.rerender(<Bubble text="hello there" time="10:01" />);
    flushFrames();
    expect(clone).toHaveBeenCalledTimes(2);

    const twin = render(<Bubble text="hello there" time="10:01" />);
    flushFrames();
    expect(clone).toHaveBeenCalledTimes(2);
    expect(twin.container.querySelector<HTMLElement>('[data-message-text-body]')?.style.width).toBe('0px');
  });
});
