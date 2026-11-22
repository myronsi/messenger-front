import { useRef, type ComponentType, type RefAttributes } from 'react';
import { BackToClose } from './BackToClose';

type CloseTrigger = ComponentType<{ className?: string; tabIndex?: number; 'aria-hidden'?: boolean } & RefAttributes<HTMLButtonElement>>;

interface WindowBackCloseProps {
  Close: CloseTrigger;
  flag: string;
}

export const WindowBackClose = ({ Close, flag }: WindowBackCloseProps) => {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Close ref={trigger} className="sr-only" tabIndex={-1} aria-hidden />
      <BackToClose flag={flag} onClose={() => trigger.current?.click()} />
    </>
  );
};
