import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageInput from './MessageInput';

vi.mock('@/entities/emoji', async () => (await import('@/test/emojiMock')).emojiEntityMock());
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const lang = await import('@/shared/lang/en');
  return { useLanguage: () => ({ translations: { ...lang.en, attachFile: 'Attach file', voiceVideoBlocked: 'No voice or video for this person' } }) };
});
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
const setErrorMessage = vi.fn();
vi.mock('../model/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    isRecording: false, isStarting: false, recordingDuration: 0, errorMessage: null,
    setErrorMessage, stopRecording: vi.fn(), handleStartRecording: vi.fn(),
  }),
}));

const renderInput = (voiceVideoBlocked: boolean) => render(
  <MessageInput
    chatId="3" token="" messageInput="" setMessageInput={vi.fn()} replyTo={null} editingMessage={null}
    onSendMessage={vi.fn()} onFileUpload={vi.fn()} onCancelReplyOrEdit={vi.fn()} voiceVideoBlocked={voiceVideoBlocked}
  />,
);

const named = (name: string) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: 10 });
  return file;
};

describe('MessageInput when the peer does not accept voice and video', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
    setErrorMessage.mockClear();
  });

  it('disables the microphone and explains why', () => {
    renderInput(true);
    const mic = screen.getByRole('button', { name: 'Hold to record a voice message' });
    expect(mic).toBeDisabled();
    expect(mic.parentElement).toHaveAttribute('title', 'No voice or video for this person');
    expect(screen.getByRole('button', { name: 'Attach file' })).toHaveAttribute('title', 'No voice or video for this person');
  });

  it('refuses a video but keeps other files', () => {
    renderInput(true);
    const input = screen.getByTestId('message-file-input');
    fireEvent.change(input, { target: { files: [named('clip.mp4')] } });
    expect(setErrorMessage).toHaveBeenCalledWith('No voice or video for this person');
    setErrorMessage.mockClear();
    fireEvent.change(input, { target: { files: [named('notes.pdf')] } });
    expect(setErrorMessage).not.toHaveBeenCalledWith('No voice or video for this person');
  });

  it('keeps the microphone when the peer accepts voice', () => {
    renderInput(false);
    const mic = screen.getByRole('button', { name: 'Hold to record a voice message' });
    expect(mic).toBeEnabled();
    expect(mic.parentElement).not.toHaveAttribute('title');
  });
});
