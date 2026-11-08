import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ProfileSettingsRow {
  label: string;
  description: string;
  icon: LucideIcon;
  indicatorCount?: number;
  onClick?: () => void;
}

interface ProfileSettingsRowsProps {
  title: string;
  description: string;
  rows: ProfileSettingsRow[];
  futureRows: ProfileSettingsRow[];
}

const ProfileSettingsRows: React.FC<ProfileSettingsRowsProps> = ({ title, description, rows, futureRows }) => (
  <section className="rounded-lg border border-border bg-card">
    <div className="border-b border-border px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    {rows.map(({ label, description: rowDescription, icon: Icon, indicatorCount = 0, onClick }) => (
      <button key={label} type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-subtle-foreground"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">{rowDescription}</span>
        </span>
        {indicatorCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">{indicatorCount > 99 ? '99+' : indicatorCount}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    ))}
    {futureRows.map(({ label, description: rowDescription, icon: Icon }) => (
      <button key={label} type="button" disabled className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">{rowDescription}</span>
        </span>
      </button>
    ))}
  </section>
);

export default ProfileSettingsRows;
