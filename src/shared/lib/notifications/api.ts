import { authFetch } from '@/shared/auth/session';
import type { components } from '@/shared/api/generated/schema';

export type NotificationPreferences = components['schemas']['NotificationPreferences'];
export type NotificationSettings = components['schemas']['NotificationSettings'];
const base = `${import.meta.env.VITE_BASE_URL}`;
let current: NotificationSettings | null = null;
let account = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const notificationSnapshot = () => current;
export const subscribeNotifications = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const notificationAccount = () => account;
export const resetNotifications = (userId = '') => { account = userId; current = null; emit(); };

export async function notificationRequest(path: string, method = 'GET', body?: unknown) {
  const response = await authFetch(`${base}${path}`, {
    method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error('Unable to update notifications. Please try again.');
  return response.status === 204 ? undefined : response.json();
}
export async function loadNotifications() {
  const user = account;
  const data = await notificationRequest('/me/notifications') as NotificationSettings;
  if (user === account) { current = data; emit(); }
  return data;
}
export async function saveNotifications(preferences: NotificationPreferences) {
  await notificationRequest('/me/notifications', 'PUT', preferences);
  await loadNotifications();
}
export async function muteNotifications(chatId: string, duration: 'off' | '1h' | '8h' | 'forever') {
  await notificationRequest(`/chats/${encodeURIComponent(chatId)}/notification-mute`, 'PUT', { duration });
  await loadNotifications();
}
