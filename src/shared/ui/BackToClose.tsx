import { useInRouterContext } from 'react-router-dom';
import { useBackToClose } from '@/shared/lib/useBackToClose';

interface BackToCloseProps {
  onClose: () => void;
  flag: string;
}

const RouterBackToClose = ({ onClose, flag }: BackToCloseProps) => {
  useBackToClose(true, onClose, flag);
  return null;
};

export const BackToClose = (props: BackToCloseProps) => (useInRouterContext() ? <RouterBackToClose {...props} /> : null);
