import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { useMessageSender } from './useMessageSender';

vi.mock('@/shared/api/uploadWithProgress', () => ({ uploadWithProgress: vi.fn(async () => ({})) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const original: Message = {
  id: '7', sender: 'me', sender_id: '1', content: 'Hello there', timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [],
};

const photo: Message = {
  ...original, type: 'file',
  content: { file_url: '/a.png', file_name: 'a.png', file_type: 'image/png', file_size: 5, caption: 'Holiday' },
};

const setup = (messageInput: string, editingMessage: Message | null = original, replyTo: Message | null = null) => {
  const send = vi.fn();
  const options = {
    chatId: '3', username: 'me', currentUserId: '1', currentUserIdRef: { current: '1' },
    translations: en, translationsRef: { current: en },
    transport: {
      wsRef: { current: { readyState: WebSocket.OPEN, send } as unknown as WebSocket },
      messageQueueRef: { current: [] }, pendingMessageIdsRef: { current: [] }, connectionRetryKey: 0, requestReconnect: vi.fn(),
    },
    setMessages: vi.fn(), setModal: vi.fn(), messageInput, setMessageInput: vi.fn(),
    editingMessage, setEditingMessage: vi.fn(), replyTo, setReplyTo: vi.fn(),
  };
  const { result } = renderHook(() => useMessageSender(options));
  return { send, options, handleSendMessage: result.current.handleSendMessage, handleFileUpload: result.current.handleFileUpload };
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

  it('ends editing a file without a caption when the caption stays empty', () => {
    const { send, options, handleSendMessage } = setup('', { ...photo, content: { ...(photo.content as object), caption: undefined } as Message['content'] });
    handleSendMessage();
    expect(send).not.toHaveBeenCalled();
    expect(options.setEditingMessage).toHaveBeenCalledWith(null);
  });

  it('removes the caption of a file when the field is emptied', () => {
    const { send, options, handleSendMessage } = setup('  ', photo);
    handleSendMessage();
    expect(JSON.parse(send.mock.calls[0][0])).toMatchObject({ type: 'edit', message_id: '7', content: '' });
    expect(options.setEditingMessage).toHaveBeenCalledWith(null);
  });

  it('does not send an empty text message edit', () => {
    const { send, handleSendMessage } = setup('');
    handleSendMessage();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('useMessageSender replies with files', () => {
  it('sends the reply target with an attachment and closes the reply bar', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }));
    const { options, handleFileUpload } = setup('', null, original);
    await act(async () => { await handleFileUpload(new File(['x'], 'a.png', { type: 'image/png' }), 'look'); });
    const form = vi.mocked(uploadWithProgress).mock.calls[0][0].formData;
    expect(form.get('reply_to')).toBe('7');
    expect(options.setReplyTo).toHaveBeenCalledWith(null);
    expect(options.setMessages).toHaveBeenCalled();
  });
});

describe('useMessageSender resending messages that were never saved', () => {
  const setupWithState = (initial: Message[] = []) => {
    let messages = initial;
    let clock = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:local', revokeObjectURL: vi.fn() }));
    const send = vi.fn();
    const pendingMessageIdsRef = { current: [] as Array<string | number> };
    const options = {
      chatId: '3', username: 'me', currentUserId: '1', currentUserIdRef: { current: '1' },
      translations: en, translationsRef: { current: en },
      transport: {
        wsRef: { current: { readyState: WebSocket.OPEN, send } as unknown as WebSocket },
        messageQueueRef: { current: [] }, pendingMessageIdsRef, connectionRetryKey: 0, requestReconnect: vi.fn(),
      },
      setMessages: vi.fn((update: Message[] | ((previous: Message[]) => Message[])) => {
        messages = typeof update === 'function' ? update(messages) : update;
      }),
      setModal: vi.fn(), messageInput: '', setMessageInput: vi.fn(),
      editingMessage: null, setEditingMessage: vi.fn(), replyTo: null, setReplyTo: vi.fn(),
    };
    const hook = renderHook(() => useMessageSender(options));
    return { send, hook, pendingMessageIdsRef, getMessages: () => messages };
  };

  it('sends an unsaved text again as a new message instead of a resend of its temporary id', () => {
    const failed: Message = { ...original, id: -5, client_temp_id: -5, sender_id: '1', delivery_error: 'Not delivered', reply_to: '2' };
    const { send, hook, pendingMessageIdsRef, getMessages } = setupWithState([failed]);
    pendingMessageIdsRef.current.push(-5);
    act(() => hook.result.current.handleResendMessage(failed));
    const payload = JSON.parse(send.mock.calls[0][0]);
    expect(payload).toMatchObject({ type: 'message', content: 'Hello there', reply_to: '2' });
    expect(payload.client_temp_id).toBeLessThan(0);
    expect(payload.client_temp_id).not.toBe(-5);
    expect(getMessages()).toHaveLength(1);
    expect(getMessages()[0]).toMatchObject({ id: payload.client_temp_id, client_temp_id: payload.client_temp_id, delivery_error: undefined });
    expect(pendingMessageIdsRef.current).toEqual([payload.client_temp_id]);
  });

  it('still asks the server to resend a saved message', () => {
    const failed: Message = { ...original, sender_id: '1', delivery_error: 'Not delivered' };
    const { send, hook } = setupWithState([failed]);
    act(() => hook.result.current.handleResendMessage(failed));
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({ type: 'resend', message_id: '7' });
  });

  it('uploads a failed file again under a new temporary id and keeps one bubble', async () => {
    vi.mocked(uploadWithProgress).mockReset().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    const { hook, getMessages } = setupWithState();
    await act(async () => { await hook.result.current.handleFileUpload(new File(['x'], 'a.png', { type: 'image/png' }), 'look'); });
    const failed = getMessages()[0];
    expect(failed).toMatchObject({ upload_status: 'failed' });
    await act(async () => { hook.result.current.handleResendMessage(failed); });
    const form = vi.mocked(uploadWithProgress).mock.calls[1][0];
    expect(form.url).toMatch(/\/messages\/upload$/);
    expect((form.formData.get('file') as File).name).toBe('a.png');
    expect(form.formData.get('caption')).toBe('look');
    expect(form.formData.get('client_temp_id')).not.toBe(String(failed.id));
    expect(getMessages()).toHaveLength(1);
    expect(String(getMessages()[0].id)).toBe(form.formData.get('client_temp_id'));
    expect(getMessages()[0].delivery_error).toBeUndefined();
  });

  it('uploads a failed voice message again as a voice message', async () => {
    vi.mocked(uploadWithProgress).mockReset().mockResolvedValue({});
    const { hook, getMessages } = setupWithState();
    let tempId = 0;
    act(() => { tempId = hook.result.current.createOptimisticUploadMessage(new Blob(['v']), 'voice_message.webm', 'voice'); });
    act(() => hook.result.current.markOptimisticUploadFailed(tempId, 'Failed'));
    await act(async () => { hook.result.current.handleResendMessage(getMessages()[0]); });
    expect(vi.mocked(uploadWithProgress).mock.calls[0][0].url).toMatch(/\/messages\/vm$/);
  });

  it('releases the local file of an upload that is abandoned when the chat closes', async () => {
    vi.mocked(uploadWithProgress).mockReset().mockRejectedValueOnce(new Error('offline'));
    const { hook } = setupWithState();
    await act(async () => { await hook.result.current.handleFileUpload(new File(['x'], 'a.png', { type: 'image/png' })); });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    hook.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local');
  });
});
