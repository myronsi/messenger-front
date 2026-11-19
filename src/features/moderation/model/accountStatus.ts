import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { AccountStatus, AccountStatusLevel, ReportOutcome } from '../api/moderationApi';

export const REPORT_REASONS = ['spam', 'scam', 'harassment', 'impersonation', 'inappropriate_profile', 'other'] as const;
export const MAX_REPORT_NOTE = 500;
export const MAX_REVIEW_TEXT = 500;

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

export const decidedByStaff = (status: AccountStatus | undefined | null) => status?.decided_by === 'staff';

export const decisionReasonLabel = (code: string | null | undefined, t: ModerationWords) => (
  code && code in t.decisionReasons ? t.decisionReasons[code as keyof ModerationWords['decisionReasons']] : t.decisionReasons.other
);

export const outcomeNotice = (outcome: Pick<ReportOutcome, 'subject_type' | 'outcome'>, t: ModerationWords) => ({
  title: outcome.subject_type in t.outcomeSubjects
    ? t.outcomeSubjects[outcome.subject_type as keyof ModerationWords['outcomeSubjects']]
    : t.outcomeSubjectFallback,
  description: outcome.outcome in t.outcomes ? t.outcomes[outcome.outcome as keyof ModerationWords['outcomes']] : t.outcomeFallback,
});
