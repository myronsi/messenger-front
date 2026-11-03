import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { Message, MessageSelection } from '@/entities/message';

export const MAX_SELECTED_MESSAGES = 100;
export const MAX_FORWARDED_MESSAGES = 20;
export const SELECTION_CLOSE_MS = 180;

const EMPTY: ReadonlySet<EntityId> = new Set();

export const isSelectableMessage = (message: Message) =>
  isPersistedId(message.id) && !message.is_deleted && !message.is_deleting && !message.upload_status;

const isCoarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

type MessageClick = (event: MouseEvent, message: Message) => void;
type State = { ids: ReadonlySet<EntityId>; closing: boolean } | null;

const closed = (state: State): State => (state && !state.closing ? { ...state, closing: true } : state);

export const useMessageSelection = (chatId: EntityId, messages: Message[] = []) => {
  const [state, setState] = useState<State>(null);
  const anchor = useRef<EntityId | null>(null);
  const loaded = useRef(messages);
  loaded.current = messages;
  const active = !!state && !state.closing;

  useEffect(() => {
    setState(null);
    anchor.current = null;
  }, [chatId]);

  useEffect(() => {
    if (!state?.closing) return undefined;
    const timer = window.setTimeout(() => setState((current) => (current?.closing ? null : current)), SELECTION_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [state?.closing]);

  const start = useCallback((message: Message) => {
    if (!isSelectableMessage(message)) return;
    anchor.current = message.id;
    setState({ ids: new Set([message.id]), closing: false });
  }, []);

  const toggle = useCallback((message: Message, extend = false) => {
    if (!isSelectableMessage(message)) return;
    const from = loaded.current.findIndex((item) => item.id === anchor.current);
    const to = loaded.current.findIndex((item) => item.id === message.id);
    const range = extend && from >= 0 && to >= 0
      ? loaded.current.slice(Math.min(from, to), Math.max(from, to) + 1).filter(isSelectableMessage)
      : null;
    anchor.current = message.id;
    setState((current) => {
      if (!current || current.closing) return current;
      const next = new Set(current.ids);
      if (range) range.forEach((item) => { if (next.size < MAX_SELECTED_MESSAGES) next.add(item.id); });
      else if (next.has(message.id)) next.delete(message.id);
      else if (next.size < MAX_SELECTED_MESSAGES) next.add(message.id);
      return next.size ? { ids: next, closing: false } : closed(current);
    });
  }, []);

  const clear = useCallback(() => {
    anchor.current = null;
    setState(closed);
  }, []);

  const intercept = useCallback((handler: MessageClick): MessageClick => (event, message) => {
    if (event.type === 'click' && (event.ctrlKey || event.metaKey || event.shiftKey)) {
      event.preventDefault();
      if (active) toggle(message, event.shiftKey);
      else start(message);
      return;
    }
    if (event.type === 'contextmenu' && isCoarsePointer()) {
      event.preventDefault();
      return;
    }
    handler(event, message);
  }, [active, start, toggle]);

  const selection = useMemo<MessageSelection>(
    () => ({ ids: state?.ids ?? EMPTY, active, closing: !!state?.closing, toggle, start }),
    [active, start, state, toggle],
  );

  return { selection, start, clear, intercept };
};
