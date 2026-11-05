import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useJumpRequest } from './useJumpRequest';

it('hands the jump only to its chat and drops it once that chat is left', () => {
  const { result, rerender } = renderHook(({ open }) => useJumpRequest(open), { initialProps: { open: '7' as string | null } });
  act(() => result.current.requestJump('7', '42'));
  expect(result.current.requestFor('7')?.messageId).toBe('42');
  expect(result.current.requestFor('8')).toBeNull();
  rerender({ open: null });
  rerender({ open: '7' });
  expect(result.current.requestFor('7')).toBeNull();
});
