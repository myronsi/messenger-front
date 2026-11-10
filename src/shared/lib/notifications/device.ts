import { getApiBaseUrl } from '@/shared/api/config';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getAccessToken } from '@/shared/auth/session';
import { notificationAccount, notificationRequest, type NotificationSettings } from './api';
import { preferredLanguage } from '@/shared/lang/preferredLanguage';

const DEVICE_KEY = 'messenger:notification-device';
const activityClientId = crypto.randomUUID();
let nativeSetup: Promise<void> | null = null;
let pendingNative: { resolve: () => void; reject: (error: Error) => void } | null = null;
let pendingNavigation: Record<string, unknown> | null = null;
export const nativeNotifications = () => Capacitor.isNativePlatform();
export const notificationSupported = () => nativeNotifications() || (
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
);
export const notificationDeviceEnabled = () => Boolean(localStorage.getItem(DEVICE_KEY));
const storeDevice = async (platform: string, destination: string, keys = {}) => {
  const user = notificationAccount();
  if (!user || !getAccessToken()) throw new Error('Please sign in again.');
  const result = await notificationRequest('/me/notification-devices', 'POST', { platform, destination, ...keys });
  if (user !== notificationAccount()) {
    await notificationRequest(`/me/notification-devices/${result.id}`, 'DELETE');
    return;
  }
  localStorage.setItem(DEVICE_KEY, JSON.stringify({ id: result.id, user }));
  window.dispatchEvent(new Event('messenger:notification-device'));
};
export const openNotificationChat = (data: Record<string, unknown>) => {
  if (!notificationAccount()) { pendingNavigation = data; return; }
  if (String(data.user_id) !== notificationAccount() || !/^\d+$/.test(String(data.chat_id))) return;
  // The authenticated route resolver loads the chat before showing it.
  window.location.assign(`/chat/${data.chat_id}?notification=1`);
};
export function resumeNotificationNavigation() {
  const data = pendingNavigation; pendingNavigation = null;
  if (data) openNotificationChat(data);
}
const accountMessage = (user: string) => ({
  type: 'notification-account', user, api: getApiBaseUrl() || '', language: preferredLanguage(),
});
export async function startNativeNotifications() {
  if (!nativeNotifications()) return;
  if (!nativeSetup) nativeSetup = initializeNative().catch((error) => { nativeSetup = null; throw error; });
  return nativeSetup;
}
async function initializeNative() {
  await PushNotifications.addListener('registration', (token) => {
    void storeDevice(Capacitor.getPlatform(), token.value).then(() => pendingNative?.resolve()).catch((error: Error) => pendingNative?.reject(error));
  });
  await PushNotifications.addListener('registrationError', () => pendingNative?.reject(new Error('Device registration failed. Please try again.')));
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => openNotificationChat(action.notification.data));
  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({ id: 'messages', name: 'Messages', importance: 4, vibration: true, visibility: 0 });
    await PushNotifications.createChannel({ id: 'messages-silent', name: 'Messages (silent)', importance: 2, vibration: false, visibility: 0 });
  }
}
export async function enableNotificationDevice(settings: NotificationSettings) {
  if (nativeNotifications()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android' ? !settings.android_push : !settings.ios_push) throw new Error('Push notifications are not configured on the server yet.');
    await startNativeNotifications();
    if ((await PushNotifications.requestPermissions()).receive !== 'granted') throw new Error('Allow notifications in your device settings.');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { pendingNative = null; reject(new Error('Registration timed out. Please try again.')); }, 20_000);
      pendingNative = {
        resolve: () => { clearTimeout(timeout); pendingNative = null; resolve(); },
        reject: (error) => { clearTimeout(timeout); pendingNative = null; reject(error); },
      };
      void PushNotifications.register().catch((error: Error) => pendingNative?.reject(error));
    });
    return;
  }
  if (!notificationSupported()) throw new Error('This browser does not support push notifications.');
  if (!settings.web_push) throw new Error('Push notifications are not configured on the server yet.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Allow notifications in your browser settings.');
  const registration = await navigator.serviceWorker.ready;
  const padded = settings.vapid_public_key.replace(/-/g, '+').replace(/_/g, '/');
  const key = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: key,
  });
  const json = subscription.toJSON();
  await storeDevice('web', subscription.endpoint, json.keys);
  registration.active?.postMessage(accountMessage(notificationAccount()));
}
export async function disableNotificationDevice() {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (raw) {
    const device = JSON.parse(raw) as { id: string };
    await notificationRequest(`/me/notification-devices/${device.id}`, 'DELETE');
  }
  if (nativeNotifications()) {
    await PushNotifications.removeAllDeliveredNotifications();
    await PushNotifications.unregister();
  }
  else if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
    registration?.active?.postMessage(accountMessage(''));
  }
  localStorage.removeItem(DEVICE_KEY);
}
export function cleanupNotificationDevice() {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (raw) {
    try {
      const device = JSON.parse(raw) as { id: string };
      const token = getAccessToken();
      if (token) void fetch(`${getApiBaseUrl()}/me/notification-devices/${device.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true,
      }).catch(() => undefined);
    } catch { /* A malformed local registration must not prevent logout. */ }
  }
  localStorage.removeItem(DEVICE_KEY);
  if (nativeNotifications()) {
    void PushNotifications.removeAllDeliveredNotifications().catch(() => undefined);
    void PushNotifications.unregister().catch(() => undefined);
  }
  else if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration().then(async (r) => {
    r?.active?.postMessage(accountMessage(''));
    await (await r?.pushManager.getSubscription())?.unsubscribe();
    for (const n of await r?.getNotifications() || []) n.close();
  }).catch(() => undefined);
}
export async function reportNotificationActivity(active: boolean) {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) return;
  const device = JSON.parse(raw) as { id: string; user: string };
  if (device.user !== notificationAccount()) return;
  await notificationRequest(`/me/notification-devices/${device.id}/activity`, 'PUT', { active, client_id: activityClientId });
}
export async function restoreNotificationDevice() {
  if (!notificationDeviceEnabled()) return;
  if (nativeNotifications()) {
    await startNativeNotifications();
    if ((await PushNotifications.checkPermissions()).receive === 'granted') await PushNotifications.register();
  } else if (notificationSupported() && Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await storeDevice('web', subscription.endpoint, subscription.toJSON().keys);
      registration.active?.postMessage(accountMessage(notificationAccount()));
    } else localStorage.removeItem(DEVICE_KEY);
  }
}
