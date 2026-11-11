import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { readUnsentMessages, writeUnsentMessages } from '@/shared/lib/unsentMessages';
import { RESEND_WINDOW_MS, isKeptUnsent, restoreUnsentMessages, useUnsentMessageStorage } from './unsentMessageStorage';

vi.mock('@/shared/auth/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/auth/session')>(), useAccessToken: () => 'token',
}));
vi.mock('@/shared/auth/tokenClaims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/auth/tokenClaims')>(), getTokenSubject: () => 'u1',
}));

const NOW = Date.parse('2026-11-11T12:00:00Z');
const confirmed: Message = { id: '10', sender: 'me', content: 'Hi', timestamp: '2026-11-11T11:00:00Z', type: 'message', is_own: true, read_by: [] };
const pending: Message = { ...confirmed, id: -5, client_temp_id: -5, content: 'Offline hello', timestamp: '2026-11-11T11:59:00Z' };
const rejected: Message = { ...pending, id: -6, client_temp_id: -6, content: 'Not allowed', delivery_error: 'Privacy' };

describe('restoreUnsentMessages', () => {
  it('adds saved unsent messages after the loaded ones and resends the pending ones', () => {
    const result = restoreUnsentMessages([confirmed], [pending, rejected], NOW, 'Not confirmed');
    expect(result.messages.map((message) => message.id)).toEqual(['10', -5, -6]);
    expect(result.pending).toEqual([pending]);
    expect(result.messages[2].delivery_error).toBe('Privacy');
  });

  it('skips saved messages the chat already has, also after they were confirmed', () => {
    const acked: Message = { ...pending, id: '11' };
    const result = restoreUnsentMessages([confirmed, acked], [pending], NOW, 'Not confirmed');
    expect(result.messages).toEqual([confirmed, acked]);
    expect(result.pending).toEqual([]);
  });

  it('resends a pending message that is still in memory', () => {
    const current = [confirmed, pending];
    const result = restoreUnsentMessages(current, [], NOW, 'Not confirmed');
    expect(result.messages).toBe(current);
    expect(result.pending).toEqual([pending]);
  });

  it('asks the user before resending a message older than the server remembers it', () => {
    const old = { ...pending, timestamp: new Date(NOW - RESEND_WINDOW_MS).toISOString() };
    const result = restoreUnsentMessages([], [old], NOW, 'Not confirmed');
    expect(result.pending).toEqual([]);
    expect(result.messages[0].delivery_error).toBe('Not confirmed');
  });

  it('keeps only own unsent text and sticker messages', () => {
    expect(isKeptUnsent(pending)).toBe(true);
    expect(isKeptUnsent({ ...pending, sticker: { id: 's1', emoji: '😀', image_url: '/s.webp' } } as Message)).toBe(true);
    expect(isKeptUnsent(confirmed)).toBe(false);
    expect(isKeptUnsent({ ...pending, is_own: false })).toBe(false);
    expect(isKeptUnsent({ ...pending, is_deleting: true })).toBe(false);
    expect(isKeptUnsent({ ...pending, type: 'file', content: { file_url: 'blob:x', file_name: 'a.png' } } as Message)).toBe(false);
  });
});

describe('useUnsentMessageStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => vi.restoreAllMocks());

  const render = (initial: Message[]) => {
    let messages = initial;
    const resend = vi.fn();
    const setMessages = vi.fn((update: Message[] | ((previous: Message[]) => Message[])) => {
      messages = typeof update === 'function' ? update(messages) : update;
    });
    const hook = renderHook(({ list }) => useUnsentMessageStorage({ chatId: '3', messages: list, setMessages, resend, notConfirmed: 'Not confirmed' }),
      { initialProps: { list: messages } });
    return { hook, resend, getMessages: () => messages };
  };

  it('restores the unsent messages of the chat after a reload and resends the pending one once', () => {
    writeUnsentMessages('u1:3', [pending, rejected]);
    const { hook, resend, getMessages } = render([confirmed]);
    expect(getMessages().map((message) => message.id)).toEqual(['10', -5, -6]);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(resend).toHaveBeenCalledWith(pending);
    hook.rerender({ list: getMessages() });
    expect(resend).toHaveBeenCalledTimes(1);
  });

  it('saves unsent messages and forgets them once confirmed', () => {
    const { hook } = render([confirmed]);
    act(() => hook.rerender({ list: [confirmed, pending, rejected] }));
    expect(readUnsentMessages<Message>('u1:3').map((message) => message.id)).toEqual([-5, -6]);
    act(() => hook.rerender({ list: [confirmed, { ...pending, id: '11' }] }));
    expect(sessionStorage.getItem('unsent:u1:3')).toBeNull();
  });
});
