import { describe, expect, it } from 'vitest';
import { normalizeRecoveryKey } from './recoveryKey';

describe('normalizeRecoveryKey', () => {
  it('strips spaces and dashes and uppercases the key', () => {
    expect(normalizeRecoveryKey(' abcd-efgh 2345\n-67qr ')).toBe('ABCDEFGH234567QR');
  });
});
