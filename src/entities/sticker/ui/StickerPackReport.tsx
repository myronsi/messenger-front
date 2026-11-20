import { PackReport } from '@/shared/ui/PackReportPage';
import { useReportStickerPackMutation } from '../api/ownPacksApi';

interface StickerPackReportProps {
  packId: string;
  mobile: boolean;
  onClose: () => void;
  onSent: () => void;
}

export const StickerPackReport = ({ packId, mobile, onClose, onSent }: StickerPackReportProps) => {
  const [report] = useReportStickerPackMutation();
  return <PackReport mobile={mobile} onClose={onClose} onSent={onSent} onSubmit={(reason) => report({ packId, reason }).unwrap()} />;
};
