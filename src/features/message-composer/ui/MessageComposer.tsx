import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type SetStateAction } from 'react';
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
  const editing = inputProps.editingMessage !== null;
  const [draft, setDraft] = useDraftState(chatDraftKey(inputProps.chatId), !editing);
  const latestRef = useRef(draft);
  latestRef.current = draft;
  const editingRef = useRef(editing);
  const beforeEditRef = useRef(draft);
  const savedDraftRef = useRef<{ chatId: unknown; value: string } | null>(null);
  useImperativeHandle(draftRef, () => ({
    get: () => latestRef.current,
    set: (value) => {
      if (!editingRef.current) beforeEditRef.current = latestRef.current;
      latestRef.current = typeof value === 'function' ? value(latestRef.current) : value;
      setDraft(latestRef.current);
    },
  }), [setDraft]);
  const { chatId } = inputProps;
  useLayoutEffect(() => {
    editingRef.current = editing;
    if (editing) {
      savedDraftRef.current ??= { chatId, value: beforeEditRef.current };
      return;
    }
    const saved = savedDraftRef.current;
    savedDraftRef.current = null;
    if (saved && saved.chatId === chatId) {
      latestRef.current = saved.value;
      setDraft(saved.value);
    }
  }, [editing, chatId, setDraft]);
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
