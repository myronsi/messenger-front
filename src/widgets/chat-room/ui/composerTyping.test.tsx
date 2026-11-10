import { fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import type { SocketSender } from '@/shared/api/realtime';
import { MessageList } from '@/features/message-list';
import { MessageComposer, type ComposerDraftHandle } from '@/features/message-composer';

const translations = { writeMessage: 'Write a message', newMessages: 'New messages', loading: 'Loading' };
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations, language: 'en' }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
const listRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/features/message-list/model/useMessageReadReceipts', async (importOriginal) => {
  const original: { useMessageReadReceipts: (options: unknown) => void } = await importOriginal();
  return {
    useMessageReadReceipts: (options: unknown) => {
      listRenders.count += 1;
      original.useMessageReadReceipts(options);
    },
  };
});
vi.mock('@/features/message-composer/model/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    isRecording: false, isStarting: false, recordingDuration: 0, errorMessage: null,
    setErrorMessage: vi.fn(), stopRecording: vi.fn(), handleStartRecording: vi.fn(),
  }),
}));

const MESSAGE_COUNT = 500;
const messages: Message[] = Array.from({ length: MESSAGE_COUNT }, (_, index) => ({
  id: String(index + 1), sender: index % 2 ? 'me' : 'bob', sender_id: index % 2 ? '1' : '2',
  content: `message ${index + 1}`, timestamp: '2026-11-10T10:00:00Z', type: 'message', read_by: [],
}));
const formatDate = () => 'Today';
const formatTime = () => '10:00';
const renderContent = (message: Message) => (typeof message.content === 'string' ? message.content : undefined);

const Screen = ({ onSend }: { onSend: (text: string) => void }) => {
  const draftRef = useRef<ComposerDraftHandle | null>(null);
  const messageRefs = useRef({});
  const wsRef = useRef<SocketSender | null>(null);
  const noop = useCallback(() => undefined, []);
  const send = useCallback(() => onSend(draftRef.current?.get() ?? ''), [onSend]);
  const [ticks, setTicks] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setTicks(ticks + 1)}>rerender screen</button>
      <MessageList
        messages={messages} username="me" userId="1" interlocutorDeleted={false} onMessageClick={noop} onAvatarClick={noop}
        highlightedMessageId={null} getFormattedDateLabel={formatDate} getMessageTime={formatTime} renderMessageContent={renderContent}
        messageRefs={messageRefs} onReplyClick={noop} wsRef={wsRef} onOpenReactionMenu={noop} tempHighlightedMessageId={null}
        setTempHighlightedMessageId={noop}
      />
      <MessageComposer draftRef={draftRef} chatId="5" token="" replyTo={null} editingMessage={null}
        onSendMessage={send} onFileUpload={noop} onCancelReplyOrEdit={noop} />
    </>
  );
};

describe('typing in the composer', () => {
  it(`does not re-render a list of ${MESSAGE_COUNT} messages and hands the text over on send`, () => {
    const onSend = vi.fn();
    render(<Screen onSend={onSend} />);
    const rendersBeforeTyping = listRenders.count;
    const field = screen.getByTestId('message-input-field');

    'hello'.split('').forEach((_, index) => fireEvent.change(field, { target: { value: 'hello'.slice(0, index + 1) } }));
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(listRenders.count).toBe(rendersBeforeTyping);
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('skips the list when the screen re-renders with the same list props', () => {
    render(<Screen onSend={vi.fn()} />);
    const rendersBefore = listRenders.count;
    fireEvent.click(screen.getByText('rerender screen'));
    expect(listRenders.count).toBe(rendersBefore);
  });
});
