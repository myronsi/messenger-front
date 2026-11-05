import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ChatLastMessage } from '@/entities/message';
import { useChatFormatters } from './useChatFormatters';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: { yesterday: 'Yesterday' } }) }));

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
