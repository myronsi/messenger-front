import { useGetSecuritySettingsQuery } from '@/features/profile';
import { useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';

export const useAccountTwoFactor = () => {
  const { data } = useGetSecuritySettingsQuery();
  return useTwoFactorConfirm(data?.two_factor_enabled);
};
