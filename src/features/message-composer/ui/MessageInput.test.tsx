import { fireEvent, render, screen } from '@testing-library/react';
import type { Message } from '@/entities/message';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageInput from './MessageInput';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {
  saveMessageEdit: 'Save edit',
  writeMessage: 'Write a message', writeCaption: 'Write a caption...', attachFile: 'Attach file', dropFileToAttach: 'Drop a file to attach it', attachDisabledWhileEditing: 'Not while editing',
} }) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
const setErrorMessage = vi.fn();
vi.mock('../model/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    isRecording: false, isStarting: false, recordingDuration: 0, errorMessage: null,
    setErrorMessage, stopRecording: vi.fn(), handleStartRecording: vi.fn(),
  }),
}));

const setPointer = (coarse: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: coarse && query.includes('coarse'), media: query })) as typeof window.matchMedia;
};

const editing: Message = { id: '7', sender: 'me', sender_id: '1', content: 'Old text', timestamp: '2026-11-02T10:00:00Z', type: 'message', read_by: [] };

const renderInput = (messageInput = 'Hello', editingMessage: Message | null = null, replyTo: Message | null = null) => {
  const onSendMessage = vi.fn();
  const onFileUpload = vi.fn();
  const onCancel = vi.fn();
  const element = (editingValue: Message | null) => (
    <MessageInput
      chatId="3" token="" messageInput={messageInput} setMessageInput={vi.fn()} replyTo={replyTo} editingMessage={editingValue}
      onSendMessage={onSendMessage} onFileUpload={onFileUpload} onCancelReplyOrEdit={onCancel}
    />
  );
  const view = render(element(editingMessage));
  return { onSendMessage, onFileUpload, onCancel, field: screen.getByTestId('message-input-field'), startEditing: () => view.rerender(element(editing)) };
};

describe('MessageInput', () => {
  beforeEach(() => setPointer(false));

  it('asks for a caption while editing a file message', () => {
    const photo: Message = { ...editing, type: 'file', content: { file_url: '/a.png', file_name: 'a.png', file_type: 'image/png', file_size: 5 } };
    const { field } = renderInput('', photo);
    expect(field).toHaveAttribute('placeholder', 'Write a caption...');
  });

  it('asks for a message while editing a text message', () => {
    const { field } = renderInput('', editing);
    expect(field).toHaveAttribute('placeholder', 'Write a message');
  });

  it('blurs a cancelled mobile edit without disabling the composer or scheduling refocus', () => {
    setPointer(true);
    const { field, onCancel } = renderInput('New text', editing);
    field.focus();
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    fireEvent.click(screen.getByTestId('reply-edit-bar').querySelector('button')!);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(field).not.toHaveFocus();
    expect(field).not.toBeDisabled();
    expect(frame).not.toHaveBeenCalled();
    frame.mockRestore();
  });

  it('lets the keyboard stay closed when a mobile reply is cancelled after hiding it', () => {
    setPointer(true);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { width: 390, height: 800, scale: 1, addEventListener: vi.fn() } });
    const { field, onCancel } = renderInput('Reply text', null, editing);
    field.focus();
    fireEvent.click(screen.getByTestId('reply-edit-bar').querySelector('button')!);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(field).not.toHaveFocus();
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
  });

  it('keeps focus when cancelling mobile replies repeatedly without delayed refocus', () => {
    setPointer(true);
    const { field, onCancel } = renderInput('Reply text', null, editing);
    field.focus();
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    const cancel = screen.getByTestId('reply-edit-bar').querySelector('button')!;
    fireEvent.click(cancel);
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(field).toHaveFocus();
    expect(field).not.toBeDisabled();
    expect(frame).not.toHaveBeenCalled();
    frame.mockRestore();
  });

  it('is a multi-line field', () => {
    const { field } = renderInput();
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveClass('max-h-[min(10rem,35vh)]');
  });

  it('sends on Enter and keeps Shift+Enter for a new line', () => {
    const { onSendMessage, field } = renderInput();
    expect(fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('adds a new line on Enter on touch screens', () => {
    setPointer(true);
    const { onSendMessage, field } = renderInput();
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(true);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('cannot attach a file while editing and drops one picked before', () => {
    const { onSendMessage, onFileUpload, field, startEditing } = renderInput('New text');
    fireEvent.change(screen.getByTestId('message-file-input'), { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } });
    expect(screen.getByTitle('photo.png')).toBeInTheDocument();
    startEditing();
    expect(screen.queryByTitle('photo.png')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach file' })).toBeDisabled();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onFileUpload).not.toHaveBeenCalled();
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('saves instead of recording a voice message while editing with an empty caption', () => {
    const { onSendMessage } = renderInput('', editing);
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }));
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Hold to record a voice message' })).not.toBeInTheDocument();
  });

  it('warns instead of sending a message over the length limit', () => {
    const { onSendMessage, field } = renderInput('x'.repeat(4097));
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalledWith(expect.stringContaining('4097 of 4096'));
  });

  it('offers to cancel instead of sending while an edit is unchanged', () => {
    const { onSendMessage, onCancel, field } = renderInput('Old text', editing);
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('sends selected photos and videos as one album with one caption', () => {
    const { onFileUpload, field } = renderInput('Trip');
    const photo = new File(['image'], 'photo.png', { type: 'image/png' });
    const video = new File(['video'], 'clip.webm', { type: 'video/webm' });
    const picker = screen.getByTestId('message-file-input');
    expect(picker).toHaveAttribute('multiple');
    fireEvent.change(picker, { target: { files: [photo] } });
    fireEvent.change(picker, { target: { files: [video] } });
    expect(screen.getByTestId('selected-media')).toContainElement(screen.getByTitle('clip.webm'));
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onFileUpload).toHaveBeenCalledExactlyOnceWith([photo, video], 'Trip', [undefined, undefined]);
    expect(screen.queryByTitle('photo.png')).not.toBeInTheDocument();
    expect(screen.queryByTitle('clip.webm')).not.toBeInTheDocument();
  });

  it('takes a file dropped anywhere on the chat', () => {
    render(
      <div data-chat-drop-zone data-testid="zone">
        <MessageInput
          chatId="3" token="" messageInput="" setMessageInput={vi.fn()} replyTo={null} editingMessage={null}
          onSendMessage={vi.fn()} onFileUpload={vi.fn()} onCancelReplyOrEdit={vi.fn()}
        />
      </div>,
    );
    const zone = screen.getByTestId('zone');
    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    const dataTransfer = { types: ['Files'], files: [file], dropEffect: 'none' };
    fireEvent.dragEnter(zone, { dataTransfer });
    expect(screen.getByTestId('file-drop-overlay')).toHaveTextContent('Drop a file to attach it');
    fireEvent.drop(zone, { dataTransfer });
    expect(screen.queryByTestId('file-drop-overlay')).not.toBeInTheDocument();
    expect(screen.getByTitle('dropped.png')).toBeInTheDocument();
  });

  it('refuses a dropped file while editing', () => {
    render(
      <div data-chat-drop-zone data-testid="zone">
        <MessageInput
          chatId="3" token="" messageInput="Old text" setMessageInput={vi.fn()} replyTo={null} editingMessage={editing}
          onSendMessage={vi.fn()} onFileUpload={vi.fn()} onCancelReplyOrEdit={vi.fn()}
        />
      </div>,
    );
    fireEvent.drop(screen.getByTestId('zone'), { dataTransfer: { types: ['Files'], files: [new File(['x'], 'dropped.png', { type: 'image/png' })] } });
    expect(screen.queryByTitle('dropped.png')).not.toBeInTheDocument();
    expect(setErrorMessage).toHaveBeenCalledWith('Not while editing');
  });
});
