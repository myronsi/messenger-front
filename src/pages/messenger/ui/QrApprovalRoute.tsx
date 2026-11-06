import { QrApprovalPage } from '@/features/auth';
import { useGetSecuritySettingsQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ModalSurface } from '@/shared/ui/ModalSurface';

export const QrApprovalRoute = ({ requestId, onClose }: { requestId: string; onClose: () => void }) => {
  const { data } = useGetSecuritySettingsQuery();
  const t = useLanguage().translations.qrLogin;
  return <ModalSurface label={t.approveTitle} lockScroll
    className="fixed inset-0 z-[1100] flex items-center justify-center overflow-y-auto bg-gradient-to-br from-blue-100 to-white p-4">
    <QrApprovalPage requestId={requestId} twoFactorEnabled={data?.two_factor_enabled} onClose={onClose} />
  </ModalSurface>;
};
