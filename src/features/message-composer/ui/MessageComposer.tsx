import React, { forwardRef, useImperativeHandle, useRef, type SetStateAction } from 'react';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { chatDraftKey } from '@/shared/lib/drafts';
import MessageInput from './MessageInput';

export interface ComposerDraftHandle {
  get: () => string;
  set: (value: SetStateAction<string>) => void;
}

type MessageInputProps = React.ComponentPropsWithoutRef<typeof MessageInput>;

interface MessageComposerProps extends Omit<MessageInputProps, 'messageInput' | 'setMessageInput'> {
  draftRef: React.Ref<ComposerDraftHandle>;
  messageInput?: string;
  setMessageInput?: (input: string) => void;
}

const MessageComposer = forwardRef<HTMLTextAreaElement, MessageComposerProps>(({
  draftRef, messageInput, setMessageInput, ...inputProps
}, ref) => {
  const [draft, setDraft] = useDraftState(chatDraftKey(inputProps.chatId), inputProps.editingMessage === null);
  const latestRef = useRef(draft);
  latestRef.current = draft;
  useImperativeHandle(draftRef, () => ({
    get: () => latestRef.current,
    set: (value) => {
      latestRef.current = typeof value === 'function' ? value(latestRef.current) : value;
      setDraft(latestRef.current);
    },
  }), [setDraft]);
  const controlled = setMessageInput !== undefined;
  return (
    <MessageInput
      ref={ref}
      {...inputProps}
      messageInput={controlled ? messageInput ?? '' : draft}
      setMessageInput={controlled ? setMessageInput : setDraft}
    />
  );
});

export default MessageComposer;
