import type { components } from '@/shared/api/generated/schema';

type InviteLink = components['schemas']['InviteLink'];

export const EXPIRY_CHOICES = ['hour', 'day', 'week', 'month', 'never'] as const;
export type ExpiryChoice = typeof EXPIRY_CHOICES[number];

const HOUR = 60 * 60 * 1000;
const EXPIRY_MS: Record<Exclude<ExpiryChoice, 'never'>, number> = { hour: HOUR, day: 24 * HOUR, week: 7 * 24 * HOUR, month: 30 * 24 * HOUR };

export const MAX_USES = 100000;

export const expiryFor = (choice: ExpiryChoice, now = Date.now()) => (choice === 'never' ? null : new Date(now + EXPIRY_MS[choice]).toISOString());

export const parseUseLimit = (text: string): number | null | 'invalid' => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  const value = Number(trimmed);
  return value >= 1 && value <= MAX_USES ? value : 'invalid';
};

export type LinkState = 'active' | 'revoked' | 'expired' | 'used_up';

export const linkState = (link: Pick<InviteLink, 'is_active' | 'revoked_at' | 'expires_at' | 'max_uses' | 'use_count'>, now = Date.now()): LinkState => {
  if (link.revoked_at) return 'revoked';
  if (link.expires_at && Date.parse(link.expires_at) <= now) return 'expired';
  if (link.max_uses !== null && link.use_count >= link.max_uses) return 'used_up';
  return link.is_active ? 'active' : 'expired';
};
