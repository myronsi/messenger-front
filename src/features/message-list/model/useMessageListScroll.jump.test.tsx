import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushFrames, message, setup, stubBrowser } from './messageListScrollHarness';
import { MessageListScrollProbe as List } from './MessageListScrollProbe';

describe('useMessageListScroll after a jump to a search result', () => {
  beforeEach(() => stubBrowser());
  afterEach(() => vi.unstubAllGlobals());

  it('does not slide down page after page when a search result is shown above messages that are not loaded yet', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });

    view.rerender(<List messages={[message('1'), message('2')]} target="1" newer />);
    view.rerender(<List messages={[message('1'), message('2')]} newer />);
    container.scrollTop = 500;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('3'), message('4')]} newer />);
    await act(async () => { flushFrames(100); });

    expect(container.scrollTop).toBe(500);
  });

  it('does not jump to the bottom when a loaded page of newer history ends with an own message', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });

    view.rerender(<List messages={[message('1'), message('2')]} target="1" newer />);
    view.rerender(<List messages={[message('1'), message('2')]} newer />);
    container.scrollTop = 300;
    container.dispatchEvent(new Event('scroll'));
    await act(async () => { flushFrames(); });

    grow(1300);
    view.rerender(<List messages={[message('1'), message('2'), message('3'), message('4')]} ownId="4" newer />);
    await act(async () => { flushFrames(100); });

    expect(container.scrollTop).toBe(300);
  });

  it('does not follow newer pages to the bottom after opening another chat at a search result', async () => {
    const { view, container, grow } = setup([]);
    view.rerender(<List messages={[message('1'), message('2')]} />);
    await act(async () => { flushFrames(); });

    view.rerender(<List messages={[]} chat="other" target="11" newer />);
    view.rerender(<List messages={[message('11'), message('12')]} chat="other" target="11" newer />);
    await act(async () => { flushFrames(); });
    const shown = container.scrollTop;

    grow(1300);
    view.rerender(<List messages={[message('11'), message('12'), message('13'), message('14')]} chat="other" target="11" newer />);
    await act(async () => { flushFrames(100); });

    expect(container.scrollTop).toBe(shown);
  });
});
