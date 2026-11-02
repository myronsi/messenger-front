import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusComposerWhenReady } from './replyFocus';

describe('focusComposerWhenReady', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('waits for the notified chat and focuses its message field only', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div data-chat-id="5"><textarea data-testid="message-input-field"></textarea></div>';
    focusComposerWhenReady('7');
    expect(document.activeElement).toBe(document.body);
    document.body.innerHTML = '<div data-chat-id="7"><textarea data-testid="message-input-field"></textarea></div>';
    vi.advanceTimersByTime(100);
    expect(document.activeElement).toBe(document.querySelector('[data-chat-id="7"] textarea'));
  });
});
