import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { nextSeekStep, useHighlightScroll } from './useHighlightScroll';

const message = (id: string): Message => ({ id, sender: 'a', content: 'x', timestamp: 't', type: 'message', read_by: [] });
const loaded = ['100', '101'].map(message);

describe('nextSeekStep', () => {
  const base = { newer: false, hasMoreMessages: true, hasMoreNewerMessages: true, canLoadAround: true };

  it('loads the page around the message at once instead of paging towards it', () => {
    expect(nextSeekStep(base)).toBe('around');
    expect(nextSeekStep({ ...base, newer: true })).toBe('around');
  });

  it('pages towards the message when the around request is not available', () => {
    expect(nextSeekStep({ ...base, canLoadAround: false })).toBe('older');
    expect(nextSeekStep({ ...base, newer: true, canLoadAround: false })).toBe('newer');
  });

  it('gives up when there is nothing more in that direction', () => {
    expect(nextSeekStep({ ...base, hasMoreMessages: false })).toBe('none');
    expect(nextSeekStep({ ...base, newer: true, hasMoreNewerMessages: false })).toBe('none');
  });
});

describe('useHighlightScroll', () => {
  const options = (overrides: Partial<Parameters<typeof useHighlightScroll>[0]> = {}) => ({
    targetId: '100', messages: loaded, messageRefs: { current: {} }, hasMoreMessages: true, isLoadingOlderMessages: false,
    onLoadOlderMessages: vi.fn(async () => undefined), hasMoreNewerMessages: true, isLoadingNewerMessages: false,
    onLoadNewerMessages: vi.fn(async () => undefined), onLoadMessagesAround: vi.fn(async () => undefined),
    chatContainerRef: { current: null }, startAnimation: vi.fn(), replacedWindowRef: { current: null }, ...overrides,
  });

  it('loads the messages around a pinned message that is not loaded with one request', () => {
    const settings = options({ targetId: '50' });
    renderHook(() => useHighlightScroll(settings));
    expect(settings.onLoadMessagesAround).toHaveBeenCalledOnce();
    expect(settings.onLoadMessagesAround).toHaveBeenCalledWith('50');
    expect(settings.onLoadOlderMessages).not.toHaveBeenCalled();
  });

  it('loads newer pages for a message newer than the loaded window, older pages otherwise, when it cannot load around', () => {
    const newer = options({ targetId: '500', onLoadMessagesAround: undefined });
    renderHook(() => useHighlightScroll(newer));
    expect(newer.onLoadNewerMessages).toHaveBeenCalledOnce();
    expect(newer.onLoadOlderMessages).not.toHaveBeenCalled();
    const older = options({ targetId: '50', onLoadMessagesAround: undefined });
    renderHook(() => useHighlightScroll(older));
    expect(older.onLoadOlderMessages).toHaveBeenCalledOnce();
  });

  it('glides to a message that is already loaded', () => {
    const row = document.createElement('div');
    const container = document.createElement('div');
    const loadedRow = options({ messageRefs: { current: { 100: row } }, chatContainerRef: { current: container } });
    renderHook(() => useHighlightScroll(loadedRow));
    expect(loadedRow.startAnimation).toHaveBeenCalledOnce();
    expect(loadedRow.onLoadOlderMessages).not.toHaveBeenCalled();
  });

  it('places a message from a replaced window a little above the center before gliding up to it', () => {
    let scrollTop = 0;
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 1000 });
    Object.defineProperty(container, 'scrollHeight', { configurable: true, get: () => 10000 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, get: () => scrollTop, set: (value: number) => { scrollTop = value; } });
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const row = document.createElement('div');
    row.getBoundingClientRect = () => ({ top: 5000 - scrollTop, height: 100 }) as DOMRect;
    const target = message('50');
    const settings = options({ targetId: '50', messageRefs: { current: {} }, chatContainerRef: { current: container } });
    const hook = renderHook((props) => useHighlightScroll(props), { initialProps: settings });
    const replaced = [target, ...loaded];
    hook.rerender({ ...settings, messages: replaced, messageRefs: { current: { 50: row } }, replacedWindowRef: { current: replaced } });
    expect(scrollTop).toBe(5000 - 450 + 600);
    expect(settings.startAnimation).toHaveBeenCalledOnce();
  });

  it('places a message that arrived with the around request just above the center before gliding to it', async () => {
    let scrollTop = 9000;
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 1000 });
    Object.defineProperty(container, 'scrollHeight', { configurable: true, get: () => 10000 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, get: () => scrollTop, set: (value: number) => { scrollTop = value; } });
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const row = document.createElement('div');
    row.getBoundingClientRect = () => ({ top: 3000 - scrollTop, height: 100 }) as DOMRect;
    const settings = options({ targetId: '50', chatContainerRef: { current: container } });
    const hook = renderHook((props) => useHighlightScroll(props), { initialProps: settings });
    expect(settings.onLoadMessagesAround).toHaveBeenCalledWith('50');
    await Promise.resolve();
    hook.rerender({ ...settings, messages: [message('49'), message('50'), message('51')], messageRefs: { current: { 50: row } } });
    expect(scrollTop).toBe(3000 - 450 + 600);
    expect(settings.startAnimation).toHaveBeenCalledOnce();
  });
});
