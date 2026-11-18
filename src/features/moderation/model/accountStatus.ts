import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { AccountStatusLevel } from '../api/moderationApi';

export const REPORT_REASONS = ['spam', 'scam', 'harassment', 'impersonation', 'inappropriate_profile', 'other'] as const;
export const MAX_REPORT_NOTE = 500;

const LEVELS: AccountStatusLevel[] = ['good', 'warned', 'limited', 'restricted', 'suspended'];

export const statusLevel = (status: string | undefined | null): AccountStatusLevel => (
  LEVELS.includes(status as AccountStatusLevel) ? status as AccountStatusLevel : status ? 'restricted' : 'good'
);

export const showsBanner = (status: string | undefined | null) => !!status && statusLevel(status) !== 'good';

type ModerationWords = Translations['moderation'];

export const restrictionLabel = (restriction: string | null | undefined, t: ModerationWords) => (
  restriction && restriction in t.restrictions ? t.restrictions[restriction as keyof ModerationWords['restrictions']] : t.restrictionFallback
);

export const restrictionToast = (restriction: string | null | undefined, t: ModerationWords) => ({
  title: t.restrictedToastTitle,
  description: fillTemplate(t.restrictedToastDescription, { action: restrictionLabel(restriction, t) }),
});

export const statusName = (status: string | undefined | null, t: ModerationWords) => t.statuses[statusLevel(status)];
