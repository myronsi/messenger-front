import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message, PinnedMessage } from '@/entities/message';
import { activeSegment, PinnedBar } from './PinnedBar';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { src?: string; 'data-testid'?: string }) => <img alt="" src={props.src} data-testid={props['data-testid']} /> }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ EmojiText: ({ text }: { text: string }) => <>{text}</> }));

const pin = (id: string, content: Message['content'], scope: PinnedMessage['scope'] = 'everyone'): PinnedMessage => ({
  message: { id, sender: 'Anna', content, timestamp: '', type: typeof content === 'string' ? 'message' : 'file', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: true,
});
const pins = [
  pin('30', 'Newest'),
  pin('20', { file_url: '/a.jpg', file_name: 'a.jpg', file_type: 'image/jpeg', file_size: 1 }, 'me'),
  pin('10', 'Oldest'),
];
const bar = () => fireEvent.click(screen.getByTitle('Go to message'));

describe('PinnedBar', () => {
  it('jumps to the shown pin, then shows the next older one and starts over after the oldest', () => {
    const onJump = vi.fn();
    render(<PinnedBar pins={pins} count={3} hasMore={false} onJump={onJump} onOpenList={vi.fn()} />);
    expect(screen.getByTestId('pinned-bar-snippet')).toHaveTextContent('Newest');
    expect(screen.getByTestId('pinned-bar-position')).toHaveTextContent('1 of 3');
    bar();
    expect(onJump).toHaveBeenLastCalledWith('30');
    expect(screen.getByTestId('pinned-bar-snippet')).toHaveTextContent('Photo');
    bar();
    expect(onJump).toHaveBeenLastCalledWith('20');
    expect(screen.getByTestId('pinned-bar-snippet')).toHaveTextContent('Oldest');
    bar();
    expect(onJump).toHaveBeenLastCalledWith('10');
    expect(screen.getByTestId('pinned-bar-snippet')).toHaveTextContent('Newest');
  });

  it('marks pins only I see with a lock', () => {
    render(<PinnedBar pins={pins} count={3} hasMore={false} onJump={vi.fn()} onOpenList={vi.fn()} />);
    expect(screen.queryByTestId('pinned-bar-lock')).not.toBeInTheDocument();
    bar();
    expect(screen.getByLabelText('Only you see this pin')).toBeInTheDocument();
  });

  it('opens the list and hides the position for a single pin', () => {
    const onOpenList = vi.fn();
    render(<PinnedBar pins={[pins[0]]} count={1} hasMore={false} onJump={vi.fn()} onOpenList={onOpenList} />);
    expect(screen.queryByTestId('pinned-bar-position')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All pinned messages' }));
    expect(onOpenList).toHaveBeenCalledTimes(1);
  });

  it('shows a plus when more pins are not loaded yet', () => {
    render(<PinnedBar pins={pins} count={3} hasMore onJump={vi.fn()} onOpenList={vi.fn()} />);
    expect(screen.getByTestId('pinned-bar-position')).toHaveTextContent('1 of 3+');
  });

  it('shows one bar per pin and lights the one on screen, at most four bars', () => {
    render(<PinnedBar pins={pins} count={3} hasMore={false} onJump={vi.fn()} onOpenList={vi.fn()} />);
    expect(screen.getByTestId('pinned-bar-segments').children).toHaveLength(3);
    expect(activeSegment(0, 3)).toBe(0);
    expect(activeSegment(2, 3)).toBe(2);
    expect(activeSegment(0, 10)).toBe(0);
    expect(activeSegment(9, 10)).toBe(3);
    expect(activeSegment(5, 10)).toBe(2);
  });

  it('shows a small picture for a pinned photo, and none for text', () => {
    render(<PinnedBar pins={pins} count={3} hasMore={false} onJump={vi.fn()} onOpenList={vi.fn()} />);
    expect(screen.queryByTestId('pinned-bar-thumbnail')).not.toBeInTheDocument();
    bar();
    expect(screen.getByTestId('pinned-bar-thumbnail')).toHaveAttribute('src', '/a.jpg');
  });
});
