import type { components } from '@/shared/api/generated/schema';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';

export type RecoveryOverview = components['schemas']['RecoveryOverview'];
export type RecoveryMethodId = 'key' | 'devices' | 'passkeys' | 'email';
export type RecoveryHealthLevel = 'full' | 'good' | 'weak' | 'none';

export const recoveryDetails: Record<RecoveryMethodId, SecurityDetail> = {
  key: 'recovery-key', devices: 'sessions', passkeys: 'passkeys', email: 'recovery-email',
};

export const recoveryMethods = (data: RecoveryOverview) => ([
  { id: 'key', available: true, active: data.recovery_key.exists },
  { id: 'devices', available: true, active: data.other_devices > 0 },
  { id: 'passkeys', available: data.passkeys_enabled, active: data.passkeys > 0 },
  { id: 'email', available: data.email.enabled, active: data.email.state === 'verified' },
] as { id: RecoveryMethodId; available: boolean; active: boolean }[]).filter(method => method.available);

export const recoveryMethodSummary = (data: RecoveryOverview) => {
  const methods = recoveryMethods(data);
  return { count: methods.filter(method => method.active).length, total: methods.length };
};

export const recoveryHealthLevel = (count: number, total: number): RecoveryHealthLevel => (
  total > 0 && count >= total ? 'full' : count >= 2 ? 'good' : count === 1 ? 'weak' : 'none'
);

const actionOrder: RecoveryMethodId[] = ['key', 'email', 'passkeys', 'devices'];

export const nextRecoveryMethod = (data: RecoveryOverview, canAddPasskey = true) => {
  const missing = recoveryMethods(data).filter(method => !method.active && (method.id !== 'passkeys' || canAddPasskey));
  return actionOrder.find(id => missing.some(method => method.id === id)) ?? null;
};

export const hasRecoveryBesidesPasskeys = (data: RecoveryOverview) => (
  data.recovery_key.exists || data.other_devices > 0 || (data.email.enabled && data.email.state === 'verified')
);
