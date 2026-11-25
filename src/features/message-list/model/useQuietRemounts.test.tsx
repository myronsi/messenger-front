import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { FRESH_MS, useQuietRemounts } from './useQuietRemounts';

const message = (id: string): Message => ({
  id, sender: 'alice', sender_id: '1', content: id, timestamp: '2026-11-25T10:00:00Z', type: 'message', read_by: [],
});

const Rows = ({ messages, shown, chat = 'a' }: { messages: Message[]; shown: string[]; chat?: string }) => {
  const refs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  useQuietRemounts(messages, refs, shown.join(','), chat);
  return <>{shown.map((id) => <div key={id} data-testid={id} ref={(element) => { refs.current[id] = element; }} />)}</>;
};

describe('useQuietRemounts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets new rows animate and keeps old rows quiet when they come back into the window', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const messages = [message('1'), message('2')];
    const view = render(<Rows messages={messages} shown={['2']} />);
    expect(view.getByTestId('2').dataset.quiet).toBeUndefined();

    now = FRESH_MS + 1;
    view.rerender(<Rows messages={[...messages, message('3')]} shown={['1', '3']} />);
    expect(view.getByTestId('1').dataset.quiet).toBe('true');
    expect(view.getByTestId('3').dataset.quiet).toBeUndefined();
  });

  it('animates again after switching chats', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const view = render(<Rows messages={[message('1')]} shown={[]} />);
    now = FRESH_MS + 1;
    view.rerender(<Rows messages={[message('1')]} shown={['1']} chat="b" />);
    expect(view.getByTestId('1').dataset.quiet).toBeUndefined();
  });
});
