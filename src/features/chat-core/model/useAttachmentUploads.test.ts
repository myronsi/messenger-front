import { act, renderHook } from '@testing-library/react';
import type { SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { useAttachmentUploads } from './useAttachmentUploads';

const upload = vi.fn();
vi.mock('@/shared/api/attachments', () => ({ uploadAttachmentWithProgress: (...args: unknown[]) => upload(...args) }));

const abortError = () => new DOMException('Upload cancelled', 'AbortError');

const setup = () => {
  let messages: Message[] = [];
  const setMessages = (update: SetStateAction<Message[]>) => {
    messages = typeof update === 'function' ? update(messages) : update;
  };
  const sendMessageEvent = vi.fn();
  const view = renderHook(() => useAttachmentUploads({
    username: 'bob',
    currentUserId: '1',
    currentUserIdRef: { current: '1' },
    translationsRef: { current: { errorLoading: 'Upload failed' } as Translations },
    setMessages,
    sendMessageEvent,
  }));
  return { ...view, sendMessageEvent, getMessages: () => messages };
};

const file = (name: string) => new File(['data'], name, { type: 'image/png' });

describe('useAttachmentUploads', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sends one message per file with the caption on the first', async () => {
    upload.mockImplementation(async (blob: File) => ({ id: `att-${blob.name}` }));
    const { result, sendMessageEvent, getMessages } = setup();
    await act(async () => result.current.handleFilesUpload([file('a.png'), file('b.png')], 'hello'));
    expect(getMessages()).toHaveLength(2);
    expect(sendMessageEvent.mock.calls.map(([, event]) => event.data)).toEqual([
      { type: 'file', attachment_id: 'att-a.png', content: 'hello' },
      { type: 'file', attachment_id: 'att-b.png', content: null },
    ]);
  });

  it('cancels an upload in flight and removes its message', async () => {
    let signal: AbortSignal | undefined;
    upload.mockImplementation((_blob: File, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal = options.signal;
      options.signal.addEventListener('abort', () => reject(abortError()));
    }));
    const { result, sendMessageEvent, getMessages } = setup();
    act(() => result.current.handleFilesUpload([file('a.png')]));
    const [message] = getMessages();
    expect(message.upload_status).toBe('uploading');

    await act(async () => result.current.cancelUpload(message.id));
    expect(signal?.aborted).toBe(true);
    expect(getMessages()).toEqual([]);
    expect(sendMessageEvent).not.toHaveBeenCalled();
  });

  it('shows the reason of a failed upload and uploads the same file again on retry', async () => {
    upload.mockRejectedValueOnce({ status: 413, data: { title: 'Too large', detail: 'The file is too large.' } });
    const { result, sendMessageEvent, getMessages } = setup();
    await act(async () => result.current.handleFilesUpload([file('a.png')]));
    const [failed] = getMessages();
    expect(failed).toMatchObject({ upload_status: 'failed', delivery_error: 'The file is too large.' });

    upload.mockResolvedValueOnce({ id: 'att-1' });
    let retried = false;
    await act(async () => { retried = result.current.retryUpload(failed.id); });
    expect(retried).toBe(true);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(sendMessageEvent).toHaveBeenCalledWith(failed.id, expect.objectContaining({ data: expect.objectContaining({ attachment_id: 'att-1' }) }), expect.any(Function));
  });

  it('only sends the message again when the upload had finished', async () => {
    upload.mockResolvedValueOnce({ id: 'att-1' });
    const { result, sendMessageEvent, getMessages } = setup();
    await act(async () => result.current.handleFilesUpload([file('a.png')]));
    const [message] = getMessages();

    act(() => { result.current.retryUpload(message.id); });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(sendMessageEvent).toHaveBeenCalledTimes(2);

    const onDelivered = sendMessageEvent.mock.calls[1][2] as () => void;
    act(() => onDelivered());
    expect(result.current.retryUpload(message.id)).toBe(false);
  });
});
