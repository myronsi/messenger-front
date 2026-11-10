import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useReplyAction } from './useReplyAction';

const message = (id: string) => ({ id, content: `text ${id}`, type: 'message' }) as unknown as Message;

const setup = (editingMessage: Message | null) => {
  const targets = {
    editingMessage,
    setReplyTo: vi.fn(),
    setEditingMessage: vi.fn(),
    setMessageInput: vi.fn(),
    messageInputRef: { current: null },
  };
  const { result } = renderHook(() => useReplyAction(targets));
  return { reply: result.current, ...targets };
};

describe('useReplyAction', () => {
  it('keeps the typed draft when replying', () => {
    const { reply, setReplyTo, setEditingMessage, setMessageInput } = setup(null);
    reply(message('1'));
    expect(setReplyTo).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    expect(setMessageInput).not.toHaveBeenCalled();
    expect(setEditingMessage).not.toHaveBeenCalled();
  });

  it('leaves edit mode and clears the edited text when replying while editing', () => {
    const { reply, setReplyTo, setEditingMessage, setMessageInput } = setup(message('2'));
    reply(message('1'));
    expect(setReplyTo).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    expect(setEditingMessage).toHaveBeenCalledWith(null);
    expect(setMessageInput).toHaveBeenCalledWith('');
  });
});
