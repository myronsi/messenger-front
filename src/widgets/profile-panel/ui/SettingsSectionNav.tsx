import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2, LogOut } from 'lucide-react';
import type { SettingsPage } from '@/shared/lib/urlOverlay';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export interface SettingsSection {
  page: SettingsPage;
  label: string;
  icon: LucideIcon;
  badge?: number;
  hint?: string;
}

interface SettingsSectionNavProps {
  avatarUrl: string;
  displayName: string;
  username: string;
  sections: SettingsSection[];
  active: SettingsPage;
  onSelect: (page: SettingsPage) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  fill?: boolean;
}

export const SettingsSectionNav: React.FC<SettingsSectionNavProps> = ({
  avatarUrl, displayName, username, sections, active, onSelect, onLogout, isLoggingOut, fill = false,
}) => {
  const { translations } = useLanguage();
  const t = translations.appShell;
  return (
    <nav aria-label={t.settingsSections} className={`flex shrink-0 flex-col gap-0.5 overflow-y-auto px-3 py-5 ${fill ? 'h-full w-full' : 'w-[260px] border-r border-border'}`}>
      {!fill && <div className="flex items-center gap-3 px-2 pb-4">
        <AuthenticatedImage src={avatarUrl} alt="" initialsFrom={displayName} className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold text-foreground">{displayName}</span>
          <span className="truncate text-[13px] text-muted-foreground">@{username}</span>
        </span>
      </div>}
      {sections.map(({ page, label, icon: Icon, badge = 0, hint }) => {
        const current = page === active;
        return (
          <button key={page} type="button" onClick={() => onSelect(page)} aria-current={current ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              current ? 'bg-primary/10 font-medium text-primary' : 'text-subtle-foreground hover:bg-accent'}`}>
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
            {hint && !badge && <span className="text-[13px] text-muted-foreground">{hint}</span>}
          </button>
        );
      })}
      <div className="flex-1" />
      <button type="button" onClick={onLogout} disabled={isLoggingOut}
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft disabled:opacity-50">
        {isLoggingOut ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />}
        {t.logOut}
      </button>
    </nav>
  );
};
