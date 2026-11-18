import { describe, expect, it } from 'vitest';
import type { Chat } from '@/entities/message';
import { createRequestChatTracker } from './requestChats';

const message = (chatId: string) => ({ type: 'message', chat_id: chatId, data: { message: { id: '1' } } });
const listed = (entries: Record<string, Partial<Chat>>) => entries as Record<string, Chat>;

describe('createRequestChatTracker', () => {
  it('knows a new request chat from chat_created before the list is refetched', () => {
    const tracker = createRequestChatTracker();
    tracker.observe({ type: 'chat_created', chat_id: '7', data: { chat: { id: '7', is_request: true } } });
    expect(tracker.isRequest(message('7'), listed({}))).toBe(true);
    expect(tracker.isRequest(message('8'), listed({}))).toBe(false);
  });

  it('follows chat_list_update when a request moves out', () => {
    const tracker = createRequestChatTracker();
    expect(tracker.isRequest(message('7'), listed({ 7: { is_request: true } }))).toBe(true);
    tracker.observe({ type: 'chat_list_update', chat_id: '7', data: { chat: { id: '7', is_request: false } } });
    expect(tracker.isRequest(message('7'), listed({ 7: { is_request: true } }))).toBe(false);
  });

  it('trusts a list that says the chat left the folder after a missed update', () => {
    const tracker = createRequestChatTracker();
    tracker.observe({ type: 'chat_created', chat_id: '7', data: { chat: { id: '7', is_request: true } } });
    expect(tracker.isRequest(message('7'), listed({ 7: { is_request: false } }))).toBe(false);
  });

  it('ignores frames without a chat', () => {
    const tracker = createRequestChatTracker();
    tracker.observe({ type: 'presence', data: {} });
    expect(tracker.isRequest({ type: 'presence', data: {} }, listed({}))).toBe(false);
  });
});
