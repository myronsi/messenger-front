import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, type SetStateAction } from 'react';
import type { Message } from '@/entities/message';
import { useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { useDraftState } from '@/shared/hooks/useDraftState';
import { chatDraftKey, draftId, readDraftContext, writeDraftContext } from '@/shared/lib/drafts';
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
  setReplyTo?: (message: Message | null) => void;
  setEditingMessage?: (message: Message | null) => void;
}

const MessageComposer = forwardRef<HTMLTextAreaElement, MessageComposerProps>(({
  draftRef, messageInput, setMessageInput, setReplyTo, setEditingMessage, ...inputProps
}, ref) => {
  const editing = inputProps.editingMessage !== null;
  const [draft, setDraft] = useDraftState(chatDraftKey(inputProps.chatId), !editing);
  const latestRef = useRef(draft);
  latestRef.current = draft;
  const editingRef = useRef(editing);
  const beforeEditRef = useRef(draft);
  const savedDraftRef = useRef<{ chatId: unknown; value: string } | null>(null);
  const contextId = draftId(getTokenSubject(useAccessToken()), chatDraftKey(inputProps.chatId));
  const restoringRef = useRef<{ id: string | null; editText?: string } | null>(null);
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
      const editText = restoringRef.current?.editText;
      if (editText !== undefined && latestRef.current !== editText) {
        latestRef.current = editText;
        setDraft(editText);
      }
      return;
    }
    const saved = savedDraftRef.current;
    savedDraftRef.current = null;
    if (saved && saved.chatId === chatId) {
      latestRef.current = saved.value;
      setDraft(saved.value);
    }
  }, [editing, chatId, setDraft]);
  const { replyTo, editingMessage } = inputProps;
  useEffect(() => {
    const saved = readDraftContext<Message>(contextId);
    restoringRef.current = { id: contextId };
    if (saved?.kind === 'reply' && setReplyTo) setReplyTo(saved.message);
    else if (saved?.kind === 'edit' && setEditingMessage) {
      restoringRef.current = { id: contextId, editText: saved.text };
      setEditingMessage(saved.message);
    } else restoringRef.current = null;
  }, [contextId, setReplyTo, setEditingMessage]);
  useEffect(() => {
    const restoring = restoringRef.current;
    if (restoring?.id === contextId) {
      const ready = restoring.editText !== undefined ? !!editingMessage && draft === restoring.editText : !!replyTo;
      if (!ready) return;
      restoringRef.current = null;
    }
    writeDraftContext<Message>(contextId, editingMessage ? { kind: 'edit', message: editingMessage, text: draft }
      : replyTo ? { kind: 'reply', message: replyTo } : null);
  }, [contextId, editingMessage, replyTo, draft]);
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
