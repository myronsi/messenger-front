import React, { useLayoutEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';
import { SheetGrip } from '@/shared/ui/SheetGrip';

interface CallSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const CallSheet: React.FC<CallSheetProps> = ({ open, title, onClose, children }) => {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" aria-describedby={undefined} overlayClassName="z-[1050] bg-black/50"
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }}
        className="z-[1050] max-h-[85vh] gap-0 overflow-y-auto rounded-t-3xl bg-card px-4 pb-6 pt-2 sm:mx-auto sm:max-w-md sm:rounded-3xl sm:border sm:pb-4">
        <div className="flex justify-center pb-2"><SheetGrip /></div>
        <SheetTitle className="mb-2 pr-8 text-base font-semibold">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
};

export default CallSheet;
