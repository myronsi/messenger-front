import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { cancelUpload } from '@/shared/lib/uploadCancellation';
import { useMessageSender } from './useMessageSender';

vi.mock('@/shared/api/uploadWithProgress', () => ({ uploadWithProgress: vi.fn() }));
vi.mock('@/shared/api/goSocket', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/goSocket')>(), isGoApi: vi.fn(() => false),
}));

const transport = () => ({
  wsRef: { current: null }, messageQueueRef: { current: [] }, pendingMessageIdsRef: { current: [] }, connectionRetryKey: 0, requestReconnect: vi.fn(),
});

describe('useMessageSender cancelled uploads', () => {
  it('removes the bubble without an error when the user cancels the upload', async () => {
    vi.mocked(uploadWithProgress).mockReset().mockImplementationOnce(({ signal }) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    }));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:local', revokeObjectURL: vi.fn() }));
    let messages: Message[] = [];
    const setMessages = vi.fn((update: Message[] | ((previous: Message[]) => Message[])) => {
      messages = typeof update === 'function' ? update(messages) : update;
    });
    const setModal = vi.fn();
    const { result } = renderHook(() => useMessageSender({
      chatId: '3', username: 'me', currentUserId: '1', currentUserIdRef: { current: '1' }, translations: en, translationsRef: { current: en },
      transport: transport(),
      setMessages, setModal, getMessageInput: () => '', setMessageInput: vi.fn(), editingMessage: null, setEditingMessage: vi.fn(), replyTo: null, setReplyTo: vi.fn(),
    }));
    let upload: Promise<void> = Promise.resolve();
    act(() => { upload = result.current.handleFileUpload(new File(['x'], 'pack.zip', { type: 'application/zip' })); });
    await act(async () => { await Promise.resolve(); });
    expect(messages).toHaveLength(1);
    await act(async () => { cancelUpload(messages[0].id); await upload; });
    expect(messages).toEqual([]);
    expect(setModal).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local');
  });
});
