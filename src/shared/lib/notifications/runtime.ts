import { loadNotifications, resetNotifications } from './api';
import { cleanupNotificationDevice, reportNotificationActivity, restoreNotificationDevice } from './device';
import { resumeNotificationNavigation, startNativeNotifications } from './device';
import { clearMessageAlerts, prepareNotificationSound } from './alerts';
let live = false;
const foreground = () => document.visibilityState === 'visible' && document.hasFocus();
export const setNotificationLive = (value: boolean) => {
  live = value; void reportNotificationActivity(value && foreground()).catch(() => undefined);
};

export function startNotifications(userId: string) {
  clearMessageAlerts();
  const device = localStorage.getItem('messenger:notification-device');
  if (device) {
    try { if (JSON.parse(device).user !== userId) cleanupNotificationDevice(); } catch { cleanupNotificationDevice(); }
  }
  resetNotifications(userId);
  const refresh = () => { void loadNotifications().catch(() => undefined); };
  refresh();
  void startNativeNotifications().then(resumeNotificationNavigation).catch(() => undefined);
  void restoreNotificationDevice().catch(() => undefined);
  const activity = () => { void reportNotificationActivity(live && foreground()).catch(() => undefined); };
  const interval = setInterval(activity, 10_000);
  document.addEventListener('visibilitychange', activity);
  window.addEventListener('focus', activity);
  window.addEventListener('blur', activity);
  window.addEventListener('messenger:notification-device', activity);
  const logout = () => { clearMessageAlerts(); cleanupNotificationDevice(); resetNotifications(); };
  window.addEventListener('messenger:logout', logout);
  window.addEventListener('focus', refresh);
  window.addEventListener('pointerdown', prepareNotificationSound);
  return () => {
    clearMessageAlerts();
    window.removeEventListener('messenger:logout', logout);
    window.removeEventListener('focus', refresh);
    window.removeEventListener('pointerdown', prepareNotificationSound);
    document.removeEventListener('visibilitychange', activity);
    window.removeEventListener('focus', activity);
    window.removeEventListener('blur', activity);
    window.removeEventListener('messenger:notification-device', activity);
    clearInterval(interval);
    resetNotifications();
  };
}
