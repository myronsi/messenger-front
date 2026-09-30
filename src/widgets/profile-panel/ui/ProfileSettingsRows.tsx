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
  <section className="rounded-lg border border-gray-200 bg-white">
    <div className="border-b border-gray-200 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
    {rows.map(({ label, description: rowDescription, icon: Icon, indicatorCount = 0, onClick }) => (
      <button key={label} type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-800">{label}</span>
          <span className="block truncate text-xs text-gray-500">{rowDescription}</span>
        </span>
        {indicatorCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">{indicatorCount > 99 ? '99+' : indicatorCount}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    ))}
    {futureRows.map(({ label, description: rowDescription, icon: Icon }) => (
      <button key={label} type="button" disabled className="flex w-full items-center gap-3 border-t border-gray-200 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-800">{label}</span>
          <span className="block truncate text-xs text-gray-500">{rowDescription}</span>
        </span>
      </button>
    ))}
  </section>
);

export default ProfileSettingsRows;
