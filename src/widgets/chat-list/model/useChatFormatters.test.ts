import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ChatLastMessage, FileMessageContent } from '@/entities/message';
import { useChatFormatters } from './useChatFormatters';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: {
  yesterday: 'Yesterday', edited: 'edited', photoMessage: 'Photo', fileMessagePreview: 'File', voiceMessagePreview: 'Voice message', noMessagesYet: 'No messages yet',
} }) }));

const file = (content: Partial<FileMessageContent>, extra: Partial<ChatLastMessage> = {}): ChatLastMessage => ({
  id: '1', sender_id: '2', sender_name: 'Anna', type: 'file', timestamp: new Date().toISOString(),
  content: { file_name: 'x.bin', file_type: 'file', file_url: '/x', ...content } as FileMessageContent, ...extra,
});
const message = (date: Date): ChatLastMessage => ({ id: '1', sender_id: '2', sender_name: 'Anna', content: 'hi', type: 'message', timestamp: date.toISOString() });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 5, 15, 0));
});

afterEach(() => vi.useRealTimers());

it('shows the time today and the shared date labels before that', () => {
  const { result } = renderHook(() => useChatFormatters('1'));
  const time = result.current.getLastMessageTime;
  expect(time(message(new Date(2026, 10, 5, 9, 30)))).toMatch(/09:30/);
  expect(time(message(new Date(2026, 10, 4, 9, 30)))).toBe('Yesterday');
  expect(time(message(new Date(2026, 10, 2, 9, 30)))).toBe('Monday');
  expect(time(message(new Date(2026, 8, 20, 9, 30)))).toBe('20 September');
  expect(time(message(new Date(2025, 11, 10, 9, 30)))).toBe('10 December');
  expect(time(message(new Date(2024, 2, 1, 9, 30)))).toBe('1 March 2024');
});

it('shows the text of edited messages without an edited prefix', () => {
  const { result } = renderHook(() => useChatFormatters('1'));
  expect(result.current.getLastMessagePreview({ ...message(new Date()), content: 'fixed typo', edited_at: new Date().toISOString() })).toBe('fixed typo');
});

it('prefers the caption of media and files over the generic label', () => {
  const { result } = renderHook(() => useChatFormatters('1'));
  const preview = result.current.getLastMessagePreview;
  expect(preview(file({ file_type: 'image', caption: '  Sunset at the lake ' }))).toBe('Sunset at the lake');
  expect(preview(file({ file_type: 'video', caption: 'Our trip' }))).toBe('Our trip');
  expect(preview(file({ file_type: 'image', caption: '   ' }))).toBe('Photo');
  expect(preview(file({ file_type: 'image' }, { edited_at: new Date().toISOString() }))).toBe('Photo');
  expect(preview(file({ file_type: 'file' }))).toBe('File');
  expect(preview(file({ file_type: 'voice', caption: 'ignored' }))).toBe('Voice message');
});
