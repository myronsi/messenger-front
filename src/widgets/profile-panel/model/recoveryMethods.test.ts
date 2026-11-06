import { describe, expect, it } from 'vitest';
import { hasRecoveryBesidesPasskeys, recoveryMethodSummary, type RecoveryOverview } from './recoveryMethods';

const overview = (changes: Partial<RecoveryOverview> = {}): RecoveryOverview => ({
  recovery_key: { exists: false, created_at: null, locked_until: null },
  other_devices: 0,
  passkeys: 0,
  passkeys_enabled: true,
  email: { address: '', state: 'not_added', enabled: true },
  ...changes,
});

describe('recoveryMethodSummary', () => {
  it('counts only methods this server offers', () => {
    const data = overview({ passkeys_enabled: false, email: { address: '', state: 'not_added', enabled: false }, other_devices: 2 });
    expect(recoveryMethodSummary(data)).toEqual({ count: 1, total: 2 });
  });

  it('counts all four methods when the server offers them', () => {
    expect(recoveryMethodSummary(overview({ passkeys: 1 }))).toEqual({ count: 1, total: 4 });
  });
});

describe('hasRecoveryBesidesPasskeys', () => {
  it('is false when the last passkey would be the only method', () => {
    expect(hasRecoveryBesidesPasskeys(overview({ passkeys: 1 }))).toBe(false);
  });

  it('is true with a recovery key, another device or a verified email', () => {
    expect(hasRecoveryBesidesPasskeys(overview({ other_devices: 1 }))).toBe(true);
    expect(hasRecoveryBesidesPasskeys(overview({ email: { address: 'a@b.c', state: 'verified', enabled: true } }))).toBe(true);
  });
});
