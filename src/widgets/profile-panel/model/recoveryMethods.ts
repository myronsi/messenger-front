import type { components } from '@/shared/api/generated/schema';

export type RecoveryOverview = components['schemas']['RecoveryOverview'];

export const recoveryMethodSummary = (data: RecoveryOverview) => {
  const methods = [
    { available: true, active: data.recovery_key.exists },
    { available: true, active: data.other_devices > 0 },
    { available: data.passkeys_enabled, active: data.passkeys > 0 },
    { available: data.email.enabled, active: data.email.state === 'verified' },
  ].filter(method => method.available);
  return { count: methods.filter(method => method.active).length, total: methods.length };
};

export const hasRecoveryBesidesPasskeys = (data: RecoveryOverview) => (
  data.recovery_key.exists || data.other_devices > 0 || (data.email.enabled && data.email.state === 'verified')
);
