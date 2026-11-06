import { Loader2, LogOut } from 'lucide-react';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { locationLabel } from '@/shared/lib/locationLabel';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { useSecuritySettings } from './useSecuritySettings';
import { SecurityRow } from './SecuritySection';

type Settings = ReturnType<typeof useSecuritySettings>;

export const SessionsList = ({ settings }: { settings: Settings }) => {
  const { language } = useLanguage();
  const { translations, securityPage: t, sessionsData, isLoadingSessions, handleRevokeSession } = settings;
  return <>
    <div role="region" aria-label={translations.activeSessions} className="overflow-hidden rounded-xl border border-border bg-card">
      <ul>
        {isLoadingSessions ? <li className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{translations.loading}
        </li> : (sessionsData?.sessions || []).map((session) => <li key={session.id}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              <span className="truncate">{deviceLabel(session.user_agent)}</span>
              {session.is_current && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{translations.current}</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {locationLabel(session.location, language) ?? t.locationUnknown} · {translations.lastActive} {new Date(session.last_active_at).toLocaleString(language === 'ru' ? 'ru-RU' : undefined)}
            </div>
          </div>
          <button type="button" onClick={() => handleRevokeSession(session.id, session.is_current)} aria-label={t.signOutSession} title={t.signOutSession}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-md text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>)}
      </ul>
    </div>
    <p className="px-1 text-xs text-muted-foreground">
      {t.locationApproximate} <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">{t.locationCredit}</a>
    </p>
  </>;
};

export const SessionDurationRow = ({ settings }: { settings: Settings }) => {
  const {
    translations, securityPage: t, securitySettings, isLoadingSecurity, isSessionDurationOpen, setIsSessionDurationOpen, handleUpdateSessionDuration,
  } = settings;
  const options = [
    { value: 30, label: t.durationMonth }, { value: 90, label: t.durationThreeMonths },
    { value: 180, label: t.durationSixMonths }, { value: 365, label: t.durationYear },
  ];
  const select = isLoadingSecurity ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Select
    open={isSessionDurationOpen}
    onOpenChange={setIsSessionDurationOpen}
    value={String(securitySettings?.session_duration_days || 90)}
    onValueChange={(value) => { setIsSessionDurationOpen(false); void handleUpdateSessionDuration(value); }}
  >
    <SelectTrigger aria-label={translations.sessionDuration} className="h-11 w-full border-input sm:w-56"
      onPointerDown={(event) => { if (isSessionDurationOpen) { event.preventDefault(); setIsSessionDurationOpen(false); } }}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="z-[1300]" onEscapeKeyDown={() => setIsSessionDurationOpen(false)} onPointerDownOutside={() => setIsSessionDurationOpen(false)}>
      {options.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
  return <SecurityRow title={translations.sessionDuration} action={select} />;
};
