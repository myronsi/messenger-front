import { useGetRecoveryOverviewQuery } from '@/features/profile';
import { RecoveryOverviewCard } from './RecoveryOverviewCard';
import { RecoveryKeySettings } from './RecoveryKeySettings';
import { PasskeySettings } from './PasskeySettings';
import { RecoveryEmailSettings } from './RecoveryEmailSettings';
import { SecurityActivity } from './SecurityActivity';

export const RecoverySettings = ({ isActive, onDismissSafetyChange }: {
  isActive: boolean; onDismissSafetyChange: (blocked: boolean) => void;
}) => {
  const { data } = useGetRecoveryOverviewQuery(undefined, { skip: !isActive });
  if (!isActive) return null;
  const locked = !data || Boolean(data.recovery_key.locked_until && Date.parse(data.recovery_key.locked_until) > Date.now());
  return <>
    <RecoveryOverviewCard />
    <RecoveryKeySettings onDismissSafetyChange={onDismissSafetyChange} />
    <PasskeySettings locked={locked} enabled={Boolean(data?.passkeys_enabled)} overview={data} />
    <RecoveryEmailSettings locked={locked} enabled={Boolean(data?.email.enabled)} />
    <SecurityActivity />
  </>;
};
