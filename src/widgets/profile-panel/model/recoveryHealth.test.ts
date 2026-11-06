import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { recoveryHealth } from './recoveryHealth';
import type { RecoveryOverview } from './recoveryMethods';

const overview = (changes: Partial<RecoveryOverview> = {}): RecoveryOverview => ({
  recovery_key: { exists: false, created_at: null, locked_until: null },
  other_devices: 0,
  passkeys: 0,
  passkeys_enabled: true,
  email: { address: '', state: 'not_added', enabled: true },
  ...changes,
});
const t = en.securityPage;

describe('recoveryHealth', () => {
  it('asks for a recovery email when three of four methods are ready', () => {
    const health = recoveryHealth(overview({ recovery_key: { exists: true, created_at: null, locked_until: null }, other_devices: 2, passkeys: 2 }), true, t);
    expect(health.headline).toBe('Your account is well protected');
    expect(health.sentence).toBe('3 of 4 ways back in are ready if you lose access. Add a recovery email to make it 4.');
    expect(health.actionLabel).toBe('Add recovery email');
    expect(health.ringLabel).toBe('3 of 4 recovery methods ready');
  });

  it('starts with the recovery key when nothing is set up', () => {
    const health = recoveryHealth(overview(), true, t);
    expect(health.level).toBe('none');
    expect(health.headline).toBe('Your account is at risk');
    expect(health.actionLabel).toBe('Create recovery key');
  });

  it('skips passkeys when this browser cannot add one', () => {
    const health = recoveryHealth(overview({
      recovery_key: { exists: true, created_at: null, locked_until: null }, email: { address: 'a@b.c', state: 'verified', enabled: true },
    }), false, t);
    expect(health.level).toBe('good');
    expect(health.next).toBe('devices');
    expect(health.actionLabel).toBeNull();
  });

  it('has no action once every offered method is ready', () => {
    const health = recoveryHealth(overview({
      recovery_key: { exists: true, created_at: null, locked_until: null }, other_devices: 1, passkeys_enabled: false,
      email: { address: '', state: 'not_added', enabled: false },
    }), true, t);
    expect(health).toMatchObject({ count: 2, total: 2, level: 'full', next: null, actionLabel: null, headline: 'Your account is fully protected' });
    expect(health.sentence).toBe('2 of 2 ways back in are ready if you lose access.');
  });
});
