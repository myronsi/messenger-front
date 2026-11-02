import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { useMessageSender } from './useMessageSender';

const original: Message = {
  id: '7', sender: 'me', sender_id: '1', content: 'Hello there', timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [],
};

const photo: Message = {
  ...original, type: 'file',
  content: { file_url: '/a.png', file_name: 'a.png', file_type: 'image/png', file_size: 5, caption: 'Holiday' },
};

const setup = (messageInput: string, editingMessage: Message = original) => {
  const send = vi.fn();
  const options = {
    chatId: '3', username: 'me', currentUserId: '1', currentUserIdRef: { current: '1' },
    translations: en, translationsRef: { current: en },
    transport: {
      wsRef: { current: { readyState: WebSocket.OPEN, send } as unknown as WebSocket },
      messageQueueRef: { current: [] }, pendingMessageIdsRef: { current: [] }, connectionRetryKey: 0, requestReconnect: vi.fn(),
    },
    setMessages: vi.fn(), setModal: vi.fn(), messageInput, setMessageInput: vi.fn(),
    editingMessage, setEditingMessage: vi.fn(), replyTo: null, setReplyTo: vi.fn(),
  };
  const { result } = renderHook(() => useMessageSender(options));
  return { send, options, handleSendMessage: result.current.handleSendMessage };
};

describe('useMessageSender editing', () => {
  it('ends editing without sending when nothing was changed', () => {
    const { send, options, handleSendMessage } = setup('  Hello there ');
    handleSendMessage();
    expect(send).not.toHaveBeenCalled();
    expect(options.setMessages).not.toHaveBeenCalled();
    expect(options.setEditingMessage).toHaveBeenCalledWith(null);
    expect(options.setMessageInput).toHaveBeenCalledWith('');
  });

  it('still sends a real change', () => {
    const { send, handleSendMessage } = setup('Hello everyone');
    handleSendMessage();
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(send.mock.calls[0][0])).toMatchObject({ type: 'edit', message_id: '7' });
  });

  it('edits the caption of a file and skips an unchanged caption', () => {
    const unchanged = setup('Holiday', photo);
    unchanged.handleSendMessage();
    expect(unchanged.send).not.toHaveBeenCalled();
    const changed = setup('Holiday 2026', photo);
    changed.handleSendMessage();
    expect(JSON.parse(changed.send.mock.calls[0][0])).toMatchObject({ type: 'edit', message_id: '7', content: 'Holiday 2026' });
  });
});
