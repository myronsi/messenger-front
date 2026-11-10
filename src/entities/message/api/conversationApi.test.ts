import { describe, expect, it } from 'vitest';
import type { Message } from '../model/types';
import { messageEntities, toMessageState } from './conversationApi';

const message = (id: string | number): Message => ({ id, type: 'message', sender: 'Alice', content: 'ok', timestamp: '', read_by: [] });
const sorted = (messages: Message[]) => messageEntities.setAll(messageEntities.getInitialState(), messages);

describe('toMessageState', () => {
  it('keeps an already ordered window as it is', () => {
    const messages = [message('99'), message('100'), message('9007199254740993'), message(-2), message(-1)];
    const state = toMessageState(messages);
    expect(state.ids).toEqual(['99', '100', '9007199254740993', -2, -1]);
    expect(state).toEqual(sorted(messages));
  });

  it('falls back to the sorted adapter for unordered or duplicated rows', () => {
    const unordered = [message('100'), message('99'), message(-1), message('5')];
    expect(toMessageState(unordered)).toEqual(sorted(unordered));
    const duplicated = [message('5'), message('5')];
    expect(toMessageState(duplicated)).toEqual(sorted(duplicated));
  });
});
