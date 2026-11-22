import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface DelayedSpinnerProps {
  label: string;
  delayMs?: number;
  className?: string;
}

export const SPINNER_DELAY_MS = 300;

export const DelayedSpinner = ({ label, delayMs = SPINNER_DELAY_MS, className }: DelayedSpinnerProps) => {
  const [visible, setVisible] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return undefined;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn('flex items-center justify-center', className)}>
      {visible && <Loader2 data-testid="delayed-spinner" className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />}
    </div>
  );
};
