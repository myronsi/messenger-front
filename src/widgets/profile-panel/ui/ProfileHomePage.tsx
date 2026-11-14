import React from 'react';
import { ChevronRight, Loader2, LogOut } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ProfileSettingsRow } from './ProfileSettingsRows';

interface ProfileHomePageProps {
  sections: ProfileSettingsRow[][];
  handleLogout: () => void;
  isLoggingOut: boolean;
}

const RowGroup: React.FC<{ rows: ProfileSettingsRow[] }> = ({ rows }) => (
  <section className="overflow-hidden rounded-2xl border border-border bg-card">
    {rows.map(({ label, description, icon: Icon, indicatorCount = 0, onClick }) => (
      <button key={label} type="button" onClick={onClick}
        className="flex min-h-[52px] w-full items-center gap-3.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60">
        <Icon className="h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{label}</span>
        {indicatorCount > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
            {indicatorCount > 99 ? '99+' : indicatorCount}
          </span>
        )}
        {description && !indicatorCount && <span className="max-w-[40%] truncate text-sm text-muted-foreground">{description}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    ))}
  </section>
);

const ProfileHomePage: React.FC<ProfileHomePageProps> = ({
  sections, handleLogout, isLoggingOut,
}) => {
  const { translations } = useLanguage();
  const t = translations.appShell;
  return (
    <div className="flex min-h-full flex-col gap-4 bg-muted/50 px-4 py-4">
      {sections.map((rows, index) => <RowGroup key={index} rows={rows} />)}
      <button type="button" onClick={handleLogout} disabled={isLoggingOut}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-border bg-card text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive-soft disabled:opacity-50">
        {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
        {t.logOut}
      </button>
    </div>
  );
};

export default ProfileHomePage;
