import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { forwardRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { readDraft, readDraftContext, writeDraft, writeDraftContext } from '@/shared/lib/drafts';
import MessageComposer from './MessageComposer';

vi.mock('@/shared/auth/tokenClaims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/auth/tokenClaims')>(), getTokenSubject: () => 'u1',
}));
type InputProps = { messageInput: string; setMessageInput: (value: string) => void; replyTo: Message | null; editingMessage: Message | null };

vi.mock('./MessageInput', () => ({
  default: forwardRef<HTMLTextAreaElement, InputProps>(
    ({ messageInput, setMessageInput, replyTo, editingMessage }, ref) => (
      <>
        <textarea ref={ref} aria-label="composer" value={messageInput} onChange={(event) => setMessageInput(event.target.value)} />
        <p data-testid="mode">{editingMessage ? `edit ${editingMessage.id}` : replyTo ? `reply ${replyTo.id}` : 'none'}</p>
      </>
    ),
  ),
}));

const original = { id: '7', content: 'old text', type: 'message', sender: 'maya', timestamp: '2026-11-12T10:00:00Z', read_by: [] } as Message;
const ID = 'u1:chat:1';
let controls: { setReplyTo: (message: Message | null) => void; setEditingMessage: (message: Message | null) => void } | null = null;

const Chat = () => {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  controls = { setReplyTo, setEditingMessage };
  return (
    <MessageComposer {...({} as React.ComponentProps<typeof MessageComposer>)} ref={null} draftRef={null} chatId="1"
      replyTo={replyTo} editingMessage={editingMessage} setReplyTo={setReplyTo} setEditingMessage={setEditingMessage} />
  );
};

const input = () => screen.getByLabelText('composer') as HTMLTextAreaElement;

beforeEach(() => sessionStorage.clear());

describe('MessageComposer reply and edit drafts', () => {
  it('saves a reply and brings it back with its text when the chat opens again', () => {
    const first = render(<Chat />);
    act(() => controls?.setReplyTo(original));
    fireEvent.change(input(), { target: { value: 'sure' } });
    expect(readDraftContext(ID)).toEqual({ kind: 'reply', message: original });
    first.unmount();

    render(<Chat />);
    expect(screen.getByTestId('mode')).toHaveTextContent('reply 7');
    expect(input().value).toBe('sure');
  });

  it('brings back an unfinished edit and keeps the normal draft for later', () => {
    writeDraft(ID, 'next message');
    writeDraftContext(ID, { kind: 'edit', message: original, text: 'old text, fixed' });
    render(<Chat />);
    expect(screen.getByTestId('mode')).toHaveTextContent('edit 7');
    expect(input().value).toBe('old text, fixed');
    expect(readDraft(ID)).toBe('next message');
    expect(readDraftContext(ID)).toEqual({ kind: 'edit', message: original, text: 'old text, fixed' });

    fireEvent.change(input(), { target: { value: 'old text, fixed twice' } });
    expect(readDraftContext(ID)).toEqual({ kind: 'edit', message: original, text: 'old text, fixed twice' });
    act(() => controls?.setEditingMessage(null));
    expect(readDraftContext(ID)).toBeNull();
    expect(input().value).toBe('next message');
  });
});
