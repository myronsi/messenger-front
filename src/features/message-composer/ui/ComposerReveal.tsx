import { useEffect, useState, type ReactNode } from 'react';

const EXIT_MS = 220;

interface ComposerRevealProps {
  show: boolean;
  children: ReactNode;
}

export const ComposerReveal = ({ show, children }: ComposerRevealProps) => {
  const [shown, setShown] = useState<ReactNode>(show ? children : null);
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) setShown(children);
  }, [show, children]);

  useEffect(() => {
    if (show) {
      setMounted(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!show && !mounted) return null;
  return (
    <div data-testid="composer-reveal" aria-hidden={!show || undefined}
      className={`${show ? 'motion-collapse-in' : 'motion-collapse-out pointer-events-none'} -mb-2 grid`}>
      <div className="min-h-0 overflow-hidden">
        <div className="pb-2">{show ? children : shown}</div>
      </div>
    </div>
  );
};
