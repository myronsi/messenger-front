import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSettingsLayout } from '../model/settingsLayout';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { AlertCircle, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { loadNotifications, notificationSnapshot } from '@/shared/lib/notifications/api';
import { saveNotifications, subscribeNotifications, type NotificationPreferences } from '@/shared/lib/notifications/api';
import { disableNotificationDevice, enableNotificationDevice, notificationDeviceEnabled, notificationSupported } from '@/shared/lib/notifications/device';

interface Status { type: 'success' | 'error'; text: string }
interface Props { isActive: boolean; onBack: () => void }

export default function NotificationSettingsPanel({ isActive, onBack }: Props) {
  const pane = useSettingsLayout() === 'pane';
  const { translations } = useLanguage();
  const t = translations.notificationSettings;
  const settings = useSyncExternalStore(subscribeNotifications, notificationSnapshot);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [enabledHere, setEnabledHere] = useState(notificationDeviceEnabled);
  const supported = notificationSupported();

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    void loadNotifications().catch(() => {
      if (!cancelled) setStatus({ type: 'error', text: t.loadFailed });
    });
    return () => { cancelled = true; };
  }, [isActive, t.loadFailed]);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(null), status.type === 'success' ? 2200 : 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const perform = async (action: () => Promise<unknown>, announce = true) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setEnabledHere(notificationDeviceEnabled());
      if (announce) setStatus({ type: 'success', text: translations.saved || t.saved });
    } catch (cause) {
      setStatus({ type: 'error', text: cause instanceof Error ? cause.message : t.saveFailed });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (settings) void perform(() => saveNotifications({ ...settings.preferences, [key]: value }));
  };

  const toggles = [
    ['enabled', t.messageNotifications, t.messageNotificationsHint],
    ['sound', t.sound, t.soundHint],
    ['previews', t.previews, t.previewsHint],
  ] as const;

  const deviceDescription = !supported
    ? t.pushUnsupported
    : enabledHere
      ? settings?.preferences.enabled ? t.pushOn : t.pushPaused
      : t.pushHint;

  return (
    <section className="relative flex h-full flex-col bg-background" aria-label={t.title}>
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {translations.notifications || t.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>

      {status && (
        <div
          role={status.type === 'error' ? 'alert' : undefined}
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">
          {t.description}
        </p>

        {!settings ? (
          status?.type === 'error' ? (
            <Button variant="outline" disabled={busy} onClick={() => void perform(loadNotifications, false)}>
              {t.loadSettings}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {translations.loading}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {toggles.map(([key, label, description]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
                <Checkbox aria-label={label} checked={settings.preferences[key]} disabled={busy} onCheckedChange={(checked) => toggle(key, checked === true)} />
              </label>
            ))}

            <div className="flex flex-col gap-3 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{t.thisDevice}</div>
                <div className="text-xs text-muted-foreground">{deviceDescription}</div>
              </div>
              <Button
                size="sm"
                variant={enabledHere ? 'outline' : 'default'}
                className="shrink-0"
                disabled={busy || !supported}
                onClick={() => void perform(() => enabledHere ? disableNotificationDevice() : enableNotificationDevice(settings))}
              >
                {enabledHere ? t.disableHere : t.enableHere}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t.muteHint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
