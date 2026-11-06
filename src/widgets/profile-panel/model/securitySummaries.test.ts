import { describe, expect, it } from 'vitest';
import { securityUi } from '@/shared/lang/en/securityUi';
import type { RecoveryOverview } from './recoveryMethods';
import { securitySummaries } from './securitySummaries';

const overview = (changes: Partial<RecoveryOverview> = {}): RecoveryOverview => ({
  recovery_key: { exists: false, created_at: null, locked_until: null },
  other_devices: 0,
  passkeys: 0,
  passkeys_enabled: true,
  email: { address: '', state: 'not_added', enabled: true },
  ...changes,
});
const summarize = (options: Partial<Parameters<typeof securitySummaries>[0]> = {}) => securitySummaries({
  labels: securityUi.securityPage, formatDate: () => '6 Nov 2026', ...options,
});

describe('securitySummaries', () => {
  it('shows nothing while the data is still loading', () => {
    expect(Object.values(summarize())).toEqual(['', '', '', '', '', '']);
  });

  it('describes methods that are not set up yet', () => {
    expect(summarize({ overview: overview(), twoFactorEnabled: false, sessionCount: 1 })).toEqual({
      password: '', 'two-factor': 'Off', passkeys: 'Not added', 'recovery-key': 'Not set up', 'recovery-email': 'Not added', sessions: '1 active',
    });
  });

  it('describes methods that are ready', () => {
    const data = overview({
      recovery_key: { exists: true, created_at: '2026-11-06T10:00:00Z', locked_until: null },
      passkeys: 2,
      email: { address: 'person@example.test', state: 'verified', enabled: true },
    });
    expect(summarize({ overview: data, twoFactorEnabled: true, sessionCount: 3 })).toMatchObject({
      'two-factor': 'On', passkeys: '2 added', 'recovery-key': 'Created 6 Nov 2026', 'recovery-email': 'Verified', sessions: '3 active',
    });
  });

  it('marks a pending email and methods this server does not offer', () => {
    expect(summarize({ overview: overview({ email: { address: 'person@example.test', state: 'pending', enabled: true } }) })['recovery-email']).toBe('Pending');
    const offline = overview({ passkeys_enabled: false, email: { address: '', state: 'not_added', enabled: false } });
    expect(summarize({ overview: offline })).toMatchObject({ passkeys: 'Not available', 'recovery-email': 'Not available' });
  });
});
