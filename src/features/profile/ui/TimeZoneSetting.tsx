import { useMemo } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { deviceTimeZone } from '@/shared/api/syncTimeZone';
import { useGetCurrentUserQuery } from '@/shared/api/currentUserApi';
import { useSetMyTimeZoneMutation } from '../api/profileExtrasApi';

const zones = () => {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
};

export const TimeZoneSetting = () => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const { data: me, refetch } = useGetCurrentUserQuery();
  const [setTimeZone, { isLoading }] = useSetMyTimeZoneMutation();
  const device = deviceTimeZone();
  const current = me?.time_zone ?? 'UTC';
  const options = useMemo(() => Array.from(new Set(['UTC', current, ...(device ? [device] : []), ...zones()])).sort(), [current, device]);
  const save = async (zone: string) => {
    if (zone === current) return;
    await setTimeZone(zone).unwrap().catch(() => undefined);
    void refetch();
  };
  return (
    <div data-testid="time-zone-setting" className="space-y-2 rounded-md border border-border px-3 py-3">
      <label htmlFor="time-zone" className="block text-sm font-medium text-foreground">{t.timeZone}</label>
      <span className="block text-xs text-muted-foreground">{t.timeZoneHint}</span>
      <div className="flex flex-wrap items-center gap-2">
        <select id="time-zone" value={current} disabled={isLoading || !me} onChange={(event) => void save(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
          {options.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>)}
        </select>
        {device && device !== current && (
          <button type="button" disabled={isLoading} onClick={() => void save(device)}
            className="motion-press rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent">
            {t.useDeviceTimeZone}
          </button>
        )}
      </div>
    </div>
  );
};
