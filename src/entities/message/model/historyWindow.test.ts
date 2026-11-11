import { describe, expect, it } from 'vitest';
import type { Message } from './types';
import { joinAroundPage, pageTouchesWindow } from './historyWindow';

const message = (id: number): Message => ({ id: String(id), sender: 'a', content: `m${id}`, timestamp: '', type: 'message', read_by: [] });
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => message(from + index));
const ids = (messages: Message[]) => messages.map((item) => Number(item.id));

describe('joinAroundPage', () => {
  it('extends the window when the page overlaps its older end', () => {
    const result = joinAroundPage(range(100, 150), range(80, 110), 500);
    expect(result.joined).toBe(true);
    expect(result.extendsOlder).toBe(true);
    expect(result.extendsNewer).toBe(false);
    expect(ids(result.messages)).toEqual(Array.from({ length: 71 }, (_, index) => 80 + index));
  });

  it('replaces the window with a page far away and keeps unsent messages', () => {
    const pending: Message = { ...message(0), id: '-5' };
    const result = joinAroundPage([...range(900, 950), pending], range(10, 60), 500);
    expect(result.joined).toBe(false);
    expect(result.extendsOlder && result.extendsNewer).toBe(true);
    expect(ids(result.messages)).toEqual([...Array.from({ length: 51 }, (_, index) => 10 + index), -5]);
  });

  it('trims the newest messages when an older page grows the window past the limit', () => {
    const result = joinAroundPage(range(100, 580), range(60, 110), 500);
    expect(result.messages).toHaveLength(500);
    expect(result.trimmedNewestId).toBe('559');
  });

  it('keeps the existing message objects for ids it already has', () => {
    const current = range(100, 120);
    const result = joinAroundPage(current, range(110, 130), 500);
    expect(result.messages.find((item) => item.id === '115')).toBe(current[15]);
  });
});

describe('pageTouchesWindow', () => {
  it('is false for an empty window', () => {
    expect(pageTouchesWindow([], range(1, 5))).toBe(false);
  });
});
