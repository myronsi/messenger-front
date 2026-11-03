import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import ReplyEditBar from './ReplyEditBar';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));

const message = (content: Message['content']): Message => ({
  id: '7', sender: 'Alice', sender_id: '1', content, timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [],
});

describe('ReplyEditBar', () => {
  it('keeps the cancel button next to a very long message', () => {
    const onCancel = vi.fn();
    render(<ReplyEditBar message={message(`${'very long message '.repeat(80)}\n\nsecond paragraph`)} mode="reply" translations={en} onCancel={onCancel} />);
    const text = screen.getByTitle(/very long message/);
    expect(text).toHaveClass('truncate');
    expect(text.textContent).not.toContain('\n');
    fireEvent.click(screen.getByRole('button', { name: en.cancel }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not take focus from the message field when cancelling', () => {
    render(<ReplyEditBar message={message('Hi')} mode="reply" translations={en} onCancel={vi.fn()} />);
    const cancel = screen.getByRole('button', { name: en.cancel });
    expect(fireEvent.pointerDown(cancel)).toBe(false);
    expect(fireEvent.mouseDown(cancel)).toBe(false);
  });

  it('shows a voice message by its label and length instead of the file name', () => {
    const voice = { ...message({ file_url: '/v.webm', file_name: 'voice_message.webm', file_type: 'voice', file_size: 1, audio_metadata: { duration: 7 } }), type: 'file' as const };
    render(<ReplyEditBar message={voice} mode="reply" translations={en} onCancel={vi.fn()} />);
    expect(screen.getByText(`${en.voiceMessage} · 0:07`)).toBeInTheDocument();
    expect(screen.queryByText('voice_message.webm')).not.toBeInTheDocument();
  });

  it('says who is being replied to and when a message is edited', () => {
    const { rerender } = render(<ReplyEditBar message={message('Hi')} mode="reply" translations={en} onCancel={vi.fn()} />);
    expect(screen.getByText(`${en.replyTo} Alice`)).toBeInTheDocument();
    rerender(<ReplyEditBar message={message('Hi')} mode="edit" translations={en} onCancel={vi.fn()} />);
    expect(screen.getByText(en.editing)).toBeInTheDocument();
  });
});
