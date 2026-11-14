import type { ReactNode } from 'react';

interface TabHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function TabHeader({ title, actions, className = '' }: TabHeaderProps) {
  return (
    <div data-testid="tab-header" className={`flex h-[72px] shrink-0 items-center gap-2 border-b border-border px-4 ${className}`}>
      <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h2>
      {actions}
    </div>
  );
}
