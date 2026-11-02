import { fireEvent, render, screen } from '@testing-library/react';
import type { Message } from '@/entities/message';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageInput from './MessageInput';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {
  writeMessage: 'Write a message', attachFile: 'Attach file', dropFileToAttach: 'Drop a file to attach it', attachDisabledWhileEditing: 'Not while editing',
} }) }));
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

const renderInput = (messageInput = 'Hello', editingMessage: Message | null = null) => {
  const onSendMessage = vi.fn();
  const onFileUpload = vi.fn();
  const element = (editingValue: Message | null) => (
    <MessageInput
      chatId="3" token="" messageInput={messageInput} setMessageInput={vi.fn()} replyTo={null} editingMessage={editingValue}
      onSendMessage={onSendMessage} onFileUpload={onFileUpload} onCancelReplyOrEdit={vi.fn()}
    />
  );
  const view = render(element(editingMessage));
  return { onSendMessage, onFileUpload, field: screen.getByTestId('message-input-field'), startEditing: () => view.rerender(element(editing)) };
};

describe('MessageInput', () => {
  beforeEach(() => setPointer(false));

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
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    startEditing();
    expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach file' })).toBeDisabled();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onFileUpload).not.toHaveBeenCalled();
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('saves instead of recording a voice message while editing with an empty caption', () => {
    const { onSendMessage } = renderInput('', editing);
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Record voice message' })).not.toBeInTheDocument();
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
    expect(screen.getByText('dropped.png')).toBeInTheDocument();
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
    expect(screen.queryByText('dropped.png')).not.toBeInTheDocument();
    expect(setErrorMessage).toHaveBeenCalledWith('Not while editing');
  });
});
