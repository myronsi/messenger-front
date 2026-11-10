import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import MessageComposer, { type ComposerDraftHandle } from './MessageComposer';

vi.mock('./MessageInput', () => ({
  default: forwardRef<HTMLTextAreaElement, { messageInput: string; setMessageInput: (value: string) => void }>(
    ({ messageInput, setMessageInput }, ref) => (
      <textarea ref={ref} aria-label="composer" value={messageInput} onChange={(event) => setMessageInput(event.target.value)} />
    ),
  ),
}));

const edited = { id: '7', content: 'old text', type: 'message' } as unknown as Message;
const handle: { current: ComposerDraftHandle | null } = { current: null };

const Composer = ({ editingMessage, chatId = '1' }: { editingMessage: Message | null; chatId?: string }) => {
  return (
    <MessageComposer
      {...({} as React.ComponentProps<typeof MessageComposer>)}
      ref={null}
      draftRef={(value) => { handle.current = value; }}
      chatId={chatId}
      editingMessage={editingMessage}
    />
  );
};

const input = () => screen.getByLabelText('composer') as HTMLTextAreaElement;

const startEdit = (rerender: (ui: React.ReactElement) => void) => {
  act(() => {
    handle.current?.set('old text');
    rerender(<Composer editingMessage={edited} />);
  });
};

describe('MessageComposer edit drafts', () => {
  it('brings back the typed draft when the edit is cancelled', () => {
    const { rerender } = render(<Composer editingMessage={null} />);
    fireEvent.change(input(), { target: { value: 'half written' } });
    startEdit(rerender);
    expect(input().value).toBe('old text');
    act(() => {
      handle.current?.set('');
      rerender(<Composer editingMessage={null} />);
    });
    expect(input().value).toBe('half written');
  });

  it('brings back the typed draft after the edit is sent', () => {
    const { rerender } = render(<Composer editingMessage={null} />);
    fireEvent.change(input(), { target: { value: 'next message' } });
    startEdit(rerender);
    fireEvent.change(input(), { target: { value: 'old text, fixed' } });
    act(() => {
      handle.current?.set('');
      rerender(<Composer editingMessage={null} />);
    });
    expect(input().value).toBe('next message');
  });

  it('does not carry the draft into another chat', () => {
    const { rerender } = render(<Composer editingMessage={null} />);
    fireEvent.change(input(), { target: { value: 'for chat one' } });
    startEdit(rerender);
    act(() => {
      handle.current?.set('');
      rerender(<Composer editingMessage={null} chatId="2" />);
    });
    expect(input().value).not.toBe('for chat one');
  });
});
