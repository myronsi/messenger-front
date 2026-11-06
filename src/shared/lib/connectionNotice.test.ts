import { describe, expect, it } from 'vitest';
import { shouldShowConnectionNotice } from './connectionNotice';

describe('shouldShowConnectionNotice', () => {
  it('stays hidden while the first connection is being made', () => {
    expect(shouldShowConnectionNotice('connecting', false)).toBe(false);
    expect(shouldShowConnectionNotice('reconnecting', false)).toBe(false);
  });

  it('shows reconnecting only after a connection was open once', () => {
    expect(shouldShowConnectionNotice('reconnecting', true)).toBe(true);
    expect(shouldShowConnectionNotice('connected', true)).toBe(false);
  });

  it('always shows a rejected connection', () => {
    expect(shouldShowConnectionNotice('rejected', false)).toBe(true);
  });
});
