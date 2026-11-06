import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { nextRecoveryMethod, recoveryHealthLevel, recoveryMethodSummary, type RecoveryMethodId, type RecoveryOverview } from './recoveryMethods';

type Copy = Translations['securityPage'];

const headlines = (t: Copy) => ({ full: t.headlineFull, good: t.headlineGood, weak: t.headlineWeak, none: t.headlineNone });
const hints = (t: Copy): Record<RecoveryMethodId, string> => ({ key: t.hintKey, email: t.hintEmail, passkeys: t.hintPasskeys, devices: t.hintDevices });
const actions = (t: Copy): Partial<Record<RecoveryMethodId, string>> => ({ key: t.actionKey, email: t.actionEmail, passkeys: t.actionPasskeys });

export const recoveryHealth = (data: RecoveryOverview, canAddPasskey: boolean, t: Copy) => {
  const { count, total } = recoveryMethodSummary(data);
  const level = recoveryHealthLevel(count, total);
  const next = nextRecoveryMethod(data, canAddPasskey);
  const values = { count: String(count), total: String(total), next: String(count + 1) };
  const summary = fillTemplate(t.summary, values);
  return {
    count, total, level, next,
    headline: headlines(t)[level],
    sentence: next ? `${summary} ${fillTemplate(hints(t)[next], values)}` : summary,
    actionLabel: next ? actions(t)[next] ?? null : null,
    ringLabel: fillTemplate(t.ringLabel, values),
  };
};
