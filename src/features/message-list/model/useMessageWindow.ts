import { MutableRefObject, RefObject, useCallback, useMemo, useRef, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import {
  DEFAULT_ROW_HEIGHT, coversView, messageKey, resolveSpan, sameRange, spanForView, type Span, type WindowRange,
} from './messageWindow';

const HEIGHT_CACHE_LIMIT = 5000;

interface MessageWindowOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  containerRef: RefObject<HTMLDivElement | null>;
  focusIds: (EntityId | null | undefined)[];
  chatKey: unknown;
}

interface WindowState { chat: unknown; range: WindowRange | null; all: boolean }

export interface MessageWindow extends Span {
  topSpace: number;
  bottomSpace: number;
  renderKey: string;
  firstRendered?: Message;
}

class RowHeights {
  private heights = new Map<string, number>();
  private sum = 0;

  get average() { return this.heights.size ? this.sum / this.heights.size : DEFAULT_ROW_HEIGHT; }

  get(key: string) { return this.heights.get(key) ?? this.average; }

  set(key: string, height: number) {
    if (this.heights.size >= HEIGHT_CACHE_LIMIT) {
      this.heights.clear();
      this.sum = 0;
    }
    this.sum += height - (this.heights.get(key) ?? 0);
    this.heights.set(key, height);
  }
}

export const useMessageWindow = ({ messages, messageRefs, containerRef, focusIds, chatKey }: MessageWindowOptions) => {
  const keys = useMemo(() => messages.map(messageKey), [messages]);
  const indexOf = useMemo(() => new Map(keys.map((key, index) => [key, index])), [keys]);
  const idIndex = useMemo(() => new Map(messages.map((message, index) => [String(message.id), index])), [messages]);
  const [state, setState] = useState<WindowState>({ chat: chatKey, range: null, all: false });
  const current = state.chat === chatKey ? state : { chat: chatKey, range: null, all: false };
  const heights = useRef(new RowHeights()).current;
  const focus = focusIds.flatMap((id) => {
    const index = id == null ? undefined : idIndex.get(String(id));
    return index === undefined ? [] : [index];
  });
  const count = messages.length;
  const span = current.all ? { start: 0, end: count } : resolveSpan(count, indexOf, current.range, focus);
  let topSpace = 0;
  let bottomSpace = 0;
  for (let index = 0; index < span.start; index += 1) topSpace += heights.get(keys[index]);
  for (let index = span.end; index < count; index += 1) bottomSpace += heights.get(keys[index]);
  const latest = useLatestRef({ span, keys, messages, chatKey, all: current.all, placed: !!current.range });

  const sync = useCallback(() => {
    const container = containerRef.current;
    const { span: rendered, keys: rowKeys, messages: rows, chatKey: chat, all, placed } = latest.current;
    if (!container) return;
    const update = (next: WindowState) => setState((previous) => (
      previous.chat === next.chat && previous.all === next.all && sameRange(previous.range, next.range) ? previous : next
    ));
    if (container.clientHeight === 0) {
      update({ chat, range: null, all: true });
      return;
    }
    if (rendered.end <= rendered.start) return;
    const origin = container.getBoundingClientRect().top - container.scrollTop;
    const measured = rows.slice(rendered.start, rendered.end).map((message) => {
      const row = messageRefs.current[message.id];
      return row?.isConnected ? row.getBoundingClientRect().bottom - origin : null;
    });
    const firstMeasured = measured.findIndex((bottom) => bottom !== null);
    if (firstMeasured === -1) return;
    const bottoms: number[] = [];
    measured.forEach((bottom, offset) => {
      const previous = bottoms[offset - 1];
      if (bottom !== null && previous !== undefined && measured[offset - 1] !== null && bottom > previous) {
        heights.set(rowKeys[rendered.start + offset], bottom - previous);
      }
      bottoms.push(bottom ?? previous ?? measured[firstMeasured]!);
    });
    const heightAt = (index: number) => heights.get(rowKeys[index]);
    const view = { top: container.scrollTop, height: container.clientHeight };
    const top = bottoms[0] - heightAt(rendered.start);
    const covered = coversView(rendered, rowKeys.length, top, bottoms[bottoms.length - 1], view);
    if (!all && placed && covered) return;
    const next = covered && !all ? rendered : spanForView(rowKeys.length, rendered, bottoms, heightAt, view);
    update({ chat, all: false, range: { startKey: rowKeys[next.start], endKey: rowKeys[next.end - 1], atEnd: next.end === rowKeys.length } });
  }, [containerRef, heights, latest, messageRefs]);

  const messageWindow: MessageWindow = {
    ...span, topSpace, bottomSpace, renderKey: `${span.start}:${span.end}:${count}`, firstRendered: span.start > 0 ? messages[span.start] : undefined,
  };
  return { messageWindow, sync };
};
