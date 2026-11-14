import type { ReactNode } from 'react';
import { ModalSurface } from '@/shared/ui/ModalSurface';

interface SheetFrameProps {
  embedded: boolean;
  label: string;
  shown: boolean;
  onBackdrop: () => void;
  children: ReactNode;
}

export function SheetFrame({ embedded, label, shown, onBackdrop, children }: SheetFrameProps) {
  if (embedded) {
    return <div role="region" aria-label={label} className="absolute inset-0 z-50 flex bg-background">{children}</div>;
  }
  return (
    <ModalSurface label="Profile"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onBackdrop(); }}
      className={`fixed inset-0 z-[1000] flex items-stretch justify-stretch bg-transparent p-0 sm:items-center sm:justify-center sm:bg-black/40 sm:px-4 sm:py-6 sm:transition-opacity sm:duration-200 ${shown ? 'sm:opacity-100' : 'pointer-events-none sm:opacity-0'}`}
    >
      {children}
    </ModalSurface>
  );
}
